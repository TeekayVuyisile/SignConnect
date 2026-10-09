import { useEffect, useRef, useState } from 'react';
import { DEMO_VOCABULARY } from '../lib/signVocabulary.js';

// Keep in sync with the installed @mediapipe/tasks-vision version.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

// Phase-4 placeholder vocabulary: MediaPipe gestures mapped to phrases, not SASL.
// A custom-trained SASL model replaces this later.
export { DEMO_VOCABULARY };

const WINDOW = 10;          // frames considered when stabilising
const AGREEMENT = 7;        // frames in the window that must agree
const CONFIDENT = 0.75;     // below this we only say "possible"
const MIN_SCORE = 0.5;      // ignore anything weaker

let recognizerPromise = null;
async function loadRecognizer() {
  recognizerPromise ??= (async () => {
    const { FilesetResolver, GestureRecognizer } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    const make = (delegate) => GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    });
    const recognizer = await make('GPU').catch(() => make('CPU'));
    return { recognizer, GestureRecognizer };
  })();
  recognizerPromise.catch(() => { recognizerPromise = null; });
  return recognizerPromise;
}

/**
 * Runs gesture recognition on the local camera, entirely on-device: no video
 * leaves the phone. Emits a stabilised result via onSign({ label, phrase, confidence }).
 * Optionally draws the hand skeleton on `canvasRef` for user feedback.
 */
export function useSignRecognition({ enabled, videoRef, canvasRef, onSign }) {
  const [status, setStatus] = useState('off'); // off | loading | watching | error
  const [live, setLive] = useState(null);      // what the model sees right now
  const onSignRef = useRef(onSign);
  onSignRef.current = onSign;

  useEffect(() => {
    if (!enabled) { setStatus('off'); setLive(null); return; }
    let cancelled = false;
    let raf = 0;
    const history = [];
    let lastEmitted = null;
    let lastLiveUpdate = 0;

    setStatus('loading');
    loadRecognizer().then(async ({ recognizer, GestureRecognizer }) => {
      if (cancelled) return;
      const { DrawingUtils } = await import('@mediapipe/tasks-vision');
      setStatus('watching');
      let lastTime = -1;

      const tick = () => {
        if (cancelled) return;
        raf = requestAnimationFrame(tick);
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.currentTime === lastTime) return;
        lastTime = video.currentTime;

        const result = recognizer.recognizeForVideo(video, performance.now());

        const canvas = canvasRef?.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const draw = new DrawingUtils(ctx);
          for (const lm of result.landmarks ?? []) {
            draw.drawConnectors(lm, GestureRecognizer.HAND_CONNECTIONS, { color: '#67E8F9', lineWidth: 4 });
            draw.drawLandmarks(lm, { color: '#34D399', lineWidth: 1, radius: 4 });
          }
        }

        // Best gesture across detected hands.
        let best = null;
        for (const hand of result.gestures ?? []) {
          const g = hand[0];
          if (g && g.categoryName !== 'None' && DEMO_VOCABULARY[g.categoryName] && (!best || g.score > best.score)) best = g;
        }
        history.push(best && best.score >= MIN_SCORE ? best : null);
        if (history.length > WINDOW) history.shift();

        const now = performance.now();
        if (now - lastLiveUpdate > 150) {
          lastLiveUpdate = now;
          setLive(best ? { label: best.categoryName, confidence: best.score } : null);
        }

        // A held sign counts once; it can repeat after the hands drop out of view.
        if (history.every((h) => !h)) lastEmitted = null;
        if (!best || best.categoryName === lastEmitted) return;
        const agreeing = history.filter((h) => h?.categoryName === best.categoryName);
        if (agreeing.length < AGREEMENT) return;

        const confidence = agreeing.reduce((s, h) => s + h.score, 0) / agreeing.length;
        lastEmitted = best.categoryName;
        onSignRef.current?.({
          label: best.categoryName,
          phrase: DEMO_VOCABULARY[best.categoryName].phrase,
          confidence,
          certain: confidence >= CONFIDENT,
        });
      };
      tick();
    }).catch((err) => {
      console.error('[sign] failed to load recognizer', err);
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      const canvas = canvasRef?.current;
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [enabled, videoRef, canvasRef]);

  return { status, live };
}
