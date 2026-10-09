// WebRTC signaling + call lifecycle. Media never touches this server:
// it only relays offers/answers/ICE candidates between the two peers.
import { Server } from 'socket.io';
import { db, getPreferences } from './db.js';
import { verifyToken } from './auth.js';
import { addSocket, removeSocket } from './presence.js';

const RING_TIMEOUT_MS = 45_000;

// callId -> { callerId, calleeId, callerSocket, calleeSocket|null, timer }
const activeCalls = new Map();

const userRoom = (id) => `user:${id}`;

export function attachSignaling(httpServer, allowedOrigins = []) {
  const io = new Server(httpServer, { cors: { origin: allowedOrigins.length ? allowedOrigins : false } });

  io.use((socket, next) => {
    try {
      const { sub, name } = verifyToken(socket.handshake.auth?.token ?? '');
      socket.data.userId = Number(sub);
      socket.data.name = name;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  const contactsOf = (userId) =>
    db.prepare('SELECT contact_id FROM contacts WHERE user_id = ?').all(userId).map((r) => r.contact_id);

  const broadcastPresence = (userId, online) => {
    for (const cid of contactsOf(userId)) io.to(userRoom(cid)).emit('presence', { userId, online });
  };

  const peerSocketOf = (call, socket) =>
    socket.id === call.callerSocket ? call.calleeSocket : call.callerSocket;

  function finishCall(callId, status, notify) {
    const call = activeCalls.get(callId);
    if (!call) return;
    clearTimeout(call.timer);
    activeCalls.delete(callId);
    if (status === 'ended') {
      db.prepare("UPDATE calls SET ended_at = datetime('now') WHERE id = ?").run(callId);
    } else {
      db.prepare("UPDATE calls SET status = ?, ended_at = datetime('now') WHERE id = ?").run(status, callId);
    }
    notify?.(call);
  }

  io.on('connection', (socket) => {
    const { userId, name } = socket.data;
    socket.join(userRoom(userId));
    if (addSocket(userId, socket.id)) broadcastPresence(userId, true);

    socket.on('call:invite', ({ to }, ack) => {
      const calleeId = Number(to);
      const isContact = db.prepare('SELECT 1 FROM contacts WHERE user_id = ? AND contact_id = ?').get(userId, calleeId);
      if (!isContact) return ack?.({ error: 'You can only call people in your contacts.' });

      const { lastInsertRowid } = db.prepare('INSERT INTO calls (caller_id, callee_id) VALUES (?, ?)').run(userId, calleeId);
      const callId = Number(lastInsertRowid);

      if (!io.sockets.adapter.rooms.get(userRoom(calleeId))?.size) {
        db.prepare("UPDATE calls SET status = 'missed', ended_at = datetime('now') WHERE id = ?").run(callId);
        return ack?.({ error: 'They’re offline right now. We’ve logged a missed call.' });
      }

      const call = {
        callerId: userId, calleeId, callerSocket: socket.id, calleeSocket: null,
        timer: setTimeout(() => finishCall(callId, 'missed', (c) => {
          io.to(c.callerSocket).emit('call:unanswered', { callId });
          io.to(userRoom(c.calleeId)).emit('call:cancelled', { callId });
        }), RING_TIMEOUT_MS),
      };
      activeCalls.set(callId, call);

      io.to(userRoom(calleeId)).emit('call:incoming', {
        callId,
        from: { id: userId, name, communication_mode: getPreferences(userId).communication_mode },
      });
      ack?.({ callId });
    });

    socket.on('call:accept', ({ callId }, ack) => {
      const call = activeCalls.get(callId);
      if (!call || call.calleeId !== userId || call.calleeSocket) return ack?.({ error: 'This call is no longer available.' });
      clearTimeout(call.timer);
      call.calleeSocket = socket.id;
      db.prepare("UPDATE calls SET status = 'answered', answered_at = datetime('now') WHERE id = ?").run(callId);

      const callerId = call.callerId;
      const caller = db.prepare('SELECT name FROM users WHERE id = ?').get(callerId);
      // Stop the ringing on the callee's other devices.
      socket.to(userRoom(userId)).emit('call:cancelled', { callId });
      io.to(call.callerSocket).emit('call:accepted', {
        callId, peer: { id: userId, name, communication_mode: getPreferences(userId).communication_mode },
      });
      ack?.({ ok: true, peer: { id: callerId, name: caller?.name, communication_mode: getPreferences(callerId).communication_mode } });
    });

    socket.on('call:decline', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call || call.calleeId !== userId) return;
      finishCall(callId, 'declined', (c) => {
        io.to(c.callerSocket).emit('call:declined', { callId });
        io.to(userRoom(c.calleeId)).emit('call:cancelled', { callId });
      });
    });

    socket.on('call:end', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call || (socket.id !== call.callerSocket && socket.id !== call.calleeSocket)) return;
      const answered = !!call.calleeSocket;
      finishCall(callId, answered ? 'ended' : 'missed', (c) => {
        if (answered) io.to(peerSocketOf(c, socket)).emit('call:ended', { callId });
        else io.to(userRoom(c.calleeId)).emit('call:cancelled', { callId });
      });
    });

    // Relay SDP offers/answers and ICE candidates to the other participant only.
    socket.on('signal', ({ callId, data }) => {
      const call = activeCalls.get(callId);
      if (!call) return;
      const peer = peerSocketOf(call, socket);
      if (peer && (socket.id === call.callerSocket || socket.id === call.calleeSocket)) {
        io.to(peer).emit('signal', { callId, data });
      }
    });

    socket.on('disconnect', () => {
      for (const [callId, call] of activeCalls) {
        if (socket.id === call.callerSocket || socket.id === call.calleeSocket) {
          const answered = !!call.calleeSocket;
          finishCall(callId, answered ? 'ended' : 'missed', (c) => {
            if (answered) io.to(peerSocketOf(c, socket)).emit('call:ended', { callId, reason: 'disconnected' });
            else io.to(userRoom(c.calleeId)).emit('call:cancelled', { callId });
          });
        }
      }
      if (removeSocket(userId, socket.id)) broadcastPresence(userId, false);
    });
  });

  return io;
}
