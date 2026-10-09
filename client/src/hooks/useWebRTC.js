import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * One-to-one peer connection. Media and caption messages flow directly between
 * the two browsers; the server only relays signaling.
 *
 * Handshake: the callee sends `ready` once its connection exists, then the
 * caller creates the offer, so neither side misses the other's messages.
 */
export function useWebRTC({ enabled, role, localStream, mediaReady, sendSignal, subscribeSignals, onMessage }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [state, setState] = useState('new'); // new | connecting | connected | reconnecting | failed
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !mediaReady) return;
    let disposed = false;
    const pendingCandidates = [];
    let offered = false;
    let restarted = false;
    let unsubscribe = () => {};

    const bindChannel = (dc) => {
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try { onMessageRef.current?.(JSON.parse(e.data)); } catch { /* ignore malformed */ }
      };
    };

    (async () => {
      const iceServers = await api('/ice').catch(() => [{ urls: 'stun:stun.l.google.com:19302' }]);
      if (disposed) return;

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      setState('connecting');

      const tracks = localStream?.getTracks() ?? [];
      tracks.forEach((t) => pc.addTrack(t, localStream));
      // Still ask to receive whatever media we can't send (e.g. no camera).
      if (!tracks.some((t) => t.kind === 'video')) pc.addTransceiver('video', { direction: 'recvonly' });
      if (!tracks.some((t) => t.kind === 'audio')) pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (e) => {
        const [stream] = e.streams;
        setRemoteStream((prev) => {
          if (stream) return stream;
          const s = prev ?? new MediaStream();
          s.addTrack(e.track);
          return new MediaStream(s.getTracks());
        });
      };
      pc.onicecandidate = (e) => { if (e.candidate) sendSignal({ type: 'candidate', candidate: e.candidate.toJSON() }); };
      pc.onconnectionstatechange = async () => {
        const s = pc.connectionState;
        // One ICE restart (e.g. after switching from Wi-Fi to mobile data) before giving up.
        if (s === 'failed' && role === 'caller' && !restarted && pc.signalingState === 'stable') {
          restarted = true;
          setState('reconnecting');
          try {
            await pc.setLocalDescription(await pc.createOffer({ iceRestart: true }));
            sendSignal({ type: 'offer', sdp: pc.localDescription.sdp });
            return;
          } catch { /* fall through to failed */ }
        }
        if (s === 'connected') restarted = false;
        setState(s === 'connected' ? 'connected' : s === 'disconnected' ? 'reconnecting' : s === 'failed' ? 'failed' : 'connecting');
      };

      if (role === 'caller') bindChannel(pc.createDataChannel('captions', { ordered: true }));
      else pc.ondatachannel = (e) => bindChannel(e.channel);

      const flushCandidates = async () => {
        while (pendingCandidates.length) await pc.addIceCandidate(pendingCandidates.shift()).catch(() => {});
      };

      unsubscribe = subscribeSignals(async (data) => {
        if (disposed) return;
        try {
          if (data.type === 'ready' && role === 'caller') {
            if (offered) return;
            offered = true;
            await pc.setLocalDescription(await pc.createOffer());
            sendSignal({ type: 'offer', sdp: pc.localDescription.sdp });
          } else if (data.type === 'offer' && role === 'callee') {
            await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
            await flushCandidates();
            await pc.setLocalDescription(await pc.createAnswer());
            sendSignal({ type: 'answer', sdp: pc.localDescription.sdp });
          } else if (data.type === 'answer' && role === 'caller') {
            await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
            await flushCandidates();
          } else if (data.type === 'candidate') {
            if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
            else pendingCandidates.push(data.candidate);
          }
        } catch (err) {
          console.error('[webrtc] signaling error', err);
          setState('failed');
        }
      });

      if (role === 'callee') sendSignal({ type: 'ready' });
    })();

    return () => {
      disposed = true;
      unsubscribe();
      dcRef.current?.close();
      pcRef.current?.close();
      dcRef.current = null;
      pcRef.current = null;
      setRemoteStream(null);
      setState('new');
    };
    // localStream identity changes on camera flip; that's handled by replaceTrack below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mediaReady, role]);

  const send = useCallback((msg) => {
    const dc = dcRef.current;
    if (dc?.readyState === 'open') { dc.send(JSON.stringify(msg)); return true; }
    return false;
  }, []);

  const replaceVideoTrack = useCallback(async (track) => {
    const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
    await sender?.replaceTrack(track);
  }, []);

  return { remoteStream, state, send, replaceVideoTrack };
}
