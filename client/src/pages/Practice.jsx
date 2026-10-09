import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Check, Loader2, RotateCcw, SkipForward, Sparkles, VideoOff } from 'lucide-react';
import HandSign from '../components/HandSign.jsx';
import { useLocalMedia } from '../hooks/useLocalMedia.js';
import { useSignRecognition } from '../hooks/useSignRecognition.js';
import { DEMO_VOCABULARY } from '../lib/signVocabulary.js';
import { readLearned, saveLearned } from '../lib/learnProgress.js';

const LABELS = Object.keys(DEMO_VOCABULARY);
const pct = (c) => `${Math.round(c * 100)}%`;

export default function Practice({ guest = false }) {
  const backTo = guest ? '/' : '/app/learn';
  const backLabel = guest ? 'Home' : 'Learn';
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const startLabel = LABELS.includes(params.get('sign')) ? params.get('sign') : LABELS[0];

  const [mode, setMode] = useState('guided'); // guided | free
  const [target, setTarget] = useState(startLabel);
  const [result, setResult] = useState(null); // { label, phrase, confidence, certain, ok }
  const [learned, setLearned] = useState(readLearned);

  const media = useLocalMedia(true, { audio: false });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== media.stream) el.srcObject = media.stream ?? null;
  }, [media.stream]);

  const sign = DEMO_VOCABULARY[target];

  const nextTarget = useCallback(() => {
    const remaining = LABELS.filter((l) => !learned.has(l) && l !== target);
    const pool = remaining.length ? remaining : LABELS.filter((l) => l !== target);
    setTarget(pool[Math.floor(Math.random() * pool.length)]);
    setResult(null);
  }, [learned, target]);

  const onSign = useCallback((s) => {
    if (mode === 'free') { setResult({ ...s, ok: true }); return; }
    const ok = s.label === target && s.certain;
    setResult({ ...s, ok, close: s.label === target && !s.certain });
    if (ok) {
      navigator.vibrate?.(120);
      setLearned((prev) => {
        const next = new Set(prev).add(s.label);
        saveLearned(next);
        return next;
      });
    }
  }, [mode, target]);

  const recognition = useSignRecognition({
    enabled: media.hasVideo,
    videoRef,
    canvasRef,
    onSign,
  });

  // After a success in guided mode, move to the next sign automatically.
  useEffect(() => {
    if (mode !== 'guided' || !result?.ok) return;
    const t = setTimeout(nextTarget, 1800);
    return () => clearTimeout(t);
  }, [mode, result, nextTarget]);

  const feedback = useMemo(() => {
    if (!media.hasVideo || recognition.status !== 'watching') return null;
    if (mode === 'guided' && result && !result.ok) {
      return result.close
        ? 'Almost! Hold it steadier, with your whole hand in view.'
        : `That looked like “${result.phrase}”. Try the shape shown above.`;
    }
    if (recognition.live) return `Seeing: ${DEMO_VOCABULARY[recognition.live.label]?.gesture ?? recognition.live.label} · ${pct(recognition.live.confidence)}`;
    return 'Show your hand to the camera';
  }, [media.hasVideo, recognition.status, recognition.live, result, mode]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#06171c] text-white">
      {/* Camera */}
      {media.hasVideo && (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full -scale-x-100 object-cover" />
          <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full -scale-x-100 object-cover" />
        </>
      )}
      {media.status === 'ready' && !media.hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 pb-40 text-center">
          <VideoOff className="size-12 text-white/80" aria-hidden="true" />
          <h1 className="text-2xl font-bold">Practice needs a camera</h1>
          <p className="max-w-sm text-white/85">
            {window.isSecureContext
              ? 'We couldn’t use a camera on this device. Allow camera access, or open SignConnect on your phone.'
              : 'Open SignConnect over https:// so your browser allows the camera.'}
          </p>
          <Link to={backTo} className="btn mt-2 bg-white px-6 text-[#06262e] hover:bg-cyan-50">Back to {backLabel}</Link>
        </div>
      )}

      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button onClick={() => navigate(backTo)} className="btn px-3 text-white hover:bg-white/15">
          <ArrowLeft className="size-5" aria-hidden="true" /> {backLabel}
        </button>
        <div role="radiogroup" aria-label="Practice mode" className="flex rounded-2xl bg-black/50 p-1">
          {[['guided', 'Guided'], ['free', 'Free play']].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={mode === v} onClick={() => { setMode(v); setResult(null); }}
              className={`min-h-11 rounded-xl px-3 font-bold transition-colors duration-200 ${mode === v ? 'bg-white text-[#06262e]' : 'text-white hover:bg-white/15'}`}>
              {l}
            </button>
          ))}
        </div>
      </header>

      {/* Status for screen readers + sighted users */}
      {(media.hasVideo || media.status === 'requesting') && (
        <p role="status" aria-live="polite" className="absolute inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top))] z-10 mx-auto w-fit max-w-[90%] rounded-full bg-black/65 px-4 py-2 text-center font-bold">
          {media.status === 'requesting' && 'Waiting for camera permission…'}
          {recognition.status === 'loading' && <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading sign AI…</span>}
          {recognition.status === 'error' && 'Sign AI couldn’t load. Check your connection and try again.'}
          {feedback}
        </p>
      )}

      {/* Bottom card */}
      {media.hasVideo && (
        <section aria-label={mode === 'guided' ? 'Sign to practise' : 'Recognised sign'}
          className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto max-w-lg overflow-hidden rounded-3xl bg-surface text-text shadow-2xl">
          {mode === 'guided' ? (
            <div className="flex items-center gap-4 p-4">
              <div className="relative flex size-28 shrink-0 items-center justify-center rounded-2xl bg-bg">
                <HandSign shape={sign.media.shape} loop label={`${sign.gesture} handshape`} className="h-24 w-20" />
                <AnimatePresence>
                  {result?.ok && (
                    <motion.span key="ok"
                      initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-accent text-on-accent">
                      <Check className="size-14" strokeWidth={3} aria-hidden="true" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold uppercase tracking-wider text-muted">
                  {result?.ok ? 'Recognised!' : 'Make this sign'}
                </p>
                <p className="text-2xl font-bold leading-tight">“{sign.phrase}”</p>
                <p className="text-muted">{sign.hint}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-bold text-muted">{learned.size}/{LABELS.length} learned</span>
                  <button onClick={nextTarget} className="btn ml-auto min-h-11 px-3 text-muted hover:bg-surface-2">
                    <SkipForward className="size-5" aria-hidden="true" /> {result?.ok ? 'Next' : 'Skip'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-36 items-center gap-4 p-4">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div key={`${result.label}-${result.confidence}`} className="flex flex-1 items-center gap-4"
                    initial={reduce ? false : { y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-bg">
                      <HandSign shape={DEMO_VOCABULARY[result.label].media.shape} className="h-20 w-16" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold uppercase tracking-wider text-muted">
                        {result.certain ? 'You signed' : 'Possibly'} · {pct(result.confidence)} sure
                      </p>
                      <p className="text-3xl font-bold leading-tight">“{result.phrase}”</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p key="empty" className="flex flex-1 items-center gap-3 text-lg text-muted" initial={false}>
                    <Sparkles className="size-6 shrink-0 text-primary" aria-hidden="true" />
                    Make any demo sign and its meaning appears here, just like in a call.
                  </motion.p>
                )}
              </AnimatePresence>
              <button onClick={() => setResult(null)} className="btn-ghost shrink-0 px-3" aria-label="Clear">
                <RotateCcw className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
