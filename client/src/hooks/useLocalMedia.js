import { useCallback, useEffect, useRef, useState } from 'react';

const VIDEO = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } };
const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

/**
 * Gets the camera and mic, degrading gracefully: video+audio, then audio only,
 * then nothing (receive-only). A device without a working camera can still join calls.
 */
export function useLocalMedia(active, { audio = true } = {}) {
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | requesting | ready
  const [issue, setIssue] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [facing, setFacing] = useState('user');
  const streamRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setStatus('requesting');

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setIssue('Camera and microphone need a secure (HTTPS) connection. You can still see and hear the other person.');
        setStatus('ready');
        return;
      }
      const attempts = audio
        ? [{ video: VIDEO, audio: AUDIO }, { video: false, audio: AUDIO }, { video: VIDEO, audio: false }]
        : [{ video: VIDEO, audio: false }];
      let s = null;
      let lastErr = null;
      for (const c of attempts) {
        try { s = await navigator.mediaDevices.getUserMedia(c); break; } catch (e) { lastErr = e; }
      }
      if (cancelled) { s?.getTracks().forEach((t) => t.stop()); return; }

      if (!s) {
        setIssue(lastErr?.name === 'NotAllowedError'
          ? 'Camera and microphone are blocked. Allow them in your browser settings to be seen and heard.'
          : 'No camera or microphone found. You can still see, hear and read the other person.');
      } else if (!s.getVideoTracks().length) {
        setIssue('No camera available, so you’re joining with audio only.');
      } else if (audio && !s.getAudioTracks().length) {
        setIssue('No microphone available, so you’re joining with video only.');
      }
      streamRef.current = s;
      setStream(s);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
      setStatus('idle');
    };
  }, [active, audio]);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const next = !camOn;
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
    setCamOn(next);
  }, [camOn]);

  /** Swap front/back camera on phones. Returns the new video track for the peer connection. */
  const flipCamera = useCallback(async () => {
    const s = streamRef.current;
    const old = s?.getVideoTracks()[0];
    if (!old) return null;
    const nextFacing = facing === 'user' ? 'environment' : 'user';
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { ...VIDEO, facingMode: nextFacing } });
      const track = fresh.getVideoTracks()[0];
      track.enabled = camOn;
      s.removeTrack(old);
      old.stop();
      s.addTrack(track);
      setFacing(nextFacing);
      setStream(new MediaStream(s.getTracks())); // new identity so <video> re-binds
      streamRef.current = s;
      return track;
    } catch {
      return null;
    }
  }, [facing, camOn]);

  const hasVideo = !!stream?.getVideoTracks().length;
  const hasAudio = !!stream?.getAudioTracks().length;

  return { stream, status, issue, hasVideo, hasAudio, micOn, camOn, facing, toggleMic, toggleCam, flipCamera };
}
