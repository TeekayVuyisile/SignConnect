// Socket connection, contact presence and the call state machine.
// Lives above the router so an incoming call can ring on any screen.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE, tokenStore } from './api.js';
import { useSession } from './session.jsx';

const CallContext = createContext(null);

const IDLE = { phase: 'idle', callId: null, peer: null, role: null, message: null };

export function CallProvider({ children }) {
  const { user } = useSession();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState({}); // userId -> online
  const [call, setCall] = useState(IDLE);
  const callRef = useRef(call);
  callRef.current = call;

  // Signals can arrive before the call screen has set up its peer connection,
  // so they are buffered here and replayed to whoever subscribes.
  const signalBuffer = useRef([]);
  const signalHandler = useRef(null);

  useEffect(() => {
    if (!user) return;
    const s = io(API_BASE || undefined, { auth: { token: tokenStore.get() }, transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('presence', ({ userId, online }) => setPresence((p) => ({ ...p, [userId]: online })));

    s.on('call:incoming', ({ callId, from }) => {
      if (callRef.current.phase !== 'idle' && callRef.current.phase !== 'ended') return; // busy
      signalBuffer.current = [];
      setCall({ phase: 'incoming', callId, peer: from, role: 'callee', message: null });
    });
    s.on('call:accepted', ({ callId, peer }) => {
      if (callRef.current.callId !== callId) return;
      setCall((c) => ({ ...c, phase: 'active', peer, startedAt: Date.now() }));
    });
    const endWith = (message) => ({ callId }) => {
      if (callRef.current.callId !== callId) return;
      setCall((c) => ({ ...c, phase: 'ended', message }));
    };
    s.on('call:declined', endWith('Call declined.'));
    s.on('call:unanswered', endWith('No answer.'));
    s.on('call:ended', endWith('Call ended.'));
    s.on('call:cancelled', ({ callId }) => {
      if (callRef.current.callId === callId && callRef.current.phase === 'incoming') setCall(IDLE);
    });
    s.on('signal', ({ callId, data }) => {
      if (callRef.current.callId !== callId) return;
      if (signalHandler.current) signalHandler.current(data);
      else signalBuffer.current.push(data);
    });

    return () => { s.disconnect(); setSocket(null); setConnected(false); };
  }, [user]);

  const startCall = useCallback((contact) => new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ error: 'You’re offline. Reconnect and try again.' });
      return;
    }
    signalBuffer.current = [];
    setCall({ phase: 'outgoing', callId: null, peer: contact, role: 'caller', message: null });
    socket.emit('call:invite', { to: contact.id }, (res) => {
      if (res?.error) setCall({ ...IDLE, phase: 'ended', peer: contact, message: res.error });
      else setCall((c) => ({ ...c, callId: res.callId }));
      resolve(res);
    });
  }), [socket]);

  const acceptCall = useCallback(() => new Promise((resolve) => {
    const { callId } = callRef.current;
    socket.emit('call:accept', { callId }, (res) => {
      if (res?.error) setCall({ ...IDLE, phase: 'ended', message: res.error });
      else setCall((c) => ({ ...c, phase: 'active', peer: res.peer, startedAt: Date.now() }));
      resolve(res);
    });
  }), [socket]);

  const declineCall = useCallback(() => {
    socket?.emit('call:decline', { callId: callRef.current.callId });
    setCall(IDLE);
  }, [socket]);

  const endCall = useCallback(() => {
    const { callId } = callRef.current;
    if (callId) socket?.emit('call:end', { callId });
    setCall((c) => ({ ...c, phase: 'ended', message: 'Call ended.' }));
  }, [socket]);

  const resetCall = useCallback(() => setCall(IDLE), []);

  const sendSignal = useCallback((data) => {
    socket?.emit('signal', { callId: callRef.current.callId, data });
  }, [socket]);

  const subscribeSignals = useCallback((handler) => {
    signalHandler.current = handler;
    const pending = signalBuffer.current.splice(0);
    pending.forEach(handler);
    return () => { if (signalHandler.current === handler) signalHandler.current = null; };
  }, []);

  const value = useMemo(() => ({
    connected, presence, call, startCall, acceptCall, declineCall, endCall, resetCall, sendSignal, subscribeSignals,
  }), [connected, presence, call, startCall, acceptCall, declineCall, endCall, resetCall, sendSignal, subscribeSignals]);

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export const useCalls = () => useContext(CallContext);
