import { useEffect, useRef, useState } from 'react';

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const speechRecognitionSupported = !!Recognition;

/**
 * Transcribes the local user's speech with the browser's speech recognizer.
 * Calls onResult({ id, text, final }) with interim results so captions appear
 * while the person is still talking. Restarts automatically, since browsers
 * stop recognition after silence.
 */
export function useSpeechCaptions({ enabled, lang = 'en-ZA', onResult }) {
  const [status, setStatus] = useState('off'); // off | listening | unsupported | blocked | error
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!enabled) { setStatus('off'); return; }
    if (!Recognition) { setStatus('unsupported'); return; }

    let stopped = false;
    let segment = 0;
    let restartTimer;
    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setStatus('listening');
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (!text) continue;
        onResultRef.current?.({ id: `s${segment}-${i}`, text, final: r.isFinal });
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stopped = true; setStatus('blocked'); }
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setStatus('error');
    };
    rec.onend = () => {
      if (stopped) return;
      segment += 1;
      restartTimer = setTimeout(() => { try { rec.start(); } catch { /* already started */ } }, 250);
    };

    try { rec.start(); } catch { setStatus('error'); }

    return () => {
      stopped = true;
      clearTimeout(restartTimer);
      rec.onend = null;
      try { rec.abort(); } catch { /* ignore */ }
    };
  }, [enabled, lang]);

  return status;
}
