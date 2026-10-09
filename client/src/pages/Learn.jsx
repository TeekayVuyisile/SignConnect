import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Camera, CheckCircle2, Clock, Hand, Lightbulb, Lock, PlayCircle, Video, X } from 'lucide-react';
import HandSign from '../components/HandSign.jsx';
import { DEMO_VOCABULARY, SASL_MODULES } from '../lib/signVocabulary.js';
import { readLearned } from '../lib/learnProgress.js';

const SIGNS = Object.entries(DEMO_VOCABULARY).map(([label, s]) => ({ label, ...s }));

function SignDetail({ sign, learned, onClose }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 md:items-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="sign-title"
        initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold text-muted">{sign.gesture}</p>
            <h2 id="sign-title" className="text-3xl font-bold">“{sign.phrase}”</h2>
          </div>
          <button onClick={onClose} className="btn -mr-2 px-0 text-muted hover:bg-surface-2" autoFocus>
            <X className="size-6" aria-hidden="true" /><span className="sr-only">Close</span>
          </button>
        </div>

        <div className="mt-4 flex justify-center rounded-3xl bg-bg py-6">
          <HandSign shape={sign.media.shape} loop label={`${sign.gesture} handshape, animated`} className="h-56 w-44" />
        </div>

        <h3 className="mt-5 text-lg font-bold">How to make it</h3>
        <ol className="mt-2 space-y-2">
          {sign.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary" aria-hidden="true">{i + 1}</span>
              <span><span className="sr-only">Step {i + 1}: </span>{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-4 flex gap-3 rounded-2xl bg-warning-soft p-3 text-warning-text">
          <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span><span className="font-bold">Camera tip: </span>{sign.tip}</span>
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link to={`/practice?sign=${sign.label}`} className="btn-primary flex-1">
            <Camera className="size-5" aria-hidden="true" /> Practise this sign
          </Link>
          {learned && (
            <p className="flex items-center justify-center gap-2 px-3 font-bold text-accent">
              <CheckCircle2 className="size-5" aria-hidden="true" /> You’ve got this one
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Learn() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(null);
  const [learned] = useState(readLearned);

  return (
    <>
      <h1 className="text-3xl font-bold">Learn signs</h1>
      <p className="mt-2 text-lg text-muted">See how each sign is made, then practise with your camera until SignConnect recognises it.</p>

      {/* Practice CTA */}
      <Link to="/practice"
        className="group mt-6 flex items-center gap-4 rounded-3xl bg-primary p-5 text-on-primary transition-colors duration-200 hover:bg-primary-hover">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-on-primary/15">
          <PlayCircle className="size-8" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold">Practise with your camera</span>
          <span className="block opacity-90">{learned.size} of {SIGNS.length} demo signs recognised so far</span>
        </span>
      </Link>

      {/* Demo signs */}
      <section aria-labelledby="demo-signs" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="demo-signs" className="text-2xl font-bold">Demo signs</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-text">
            <CheckCircle2 className="size-4 text-accent" aria-hidden="true" /> Work in calls today
          </span>
        </div>
        <p className="mt-2 text-muted">
          These are general hand gestures, not SASL. They let you try sign translation now, while the SASL vocabulary is being built.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SIGNS.map((s, i) => (
            <motion.li key={s.label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}>
              <button onClick={() => setOpen(s)}
                className="relative flex h-full w-full flex-col items-center rounded-3xl border border-border bg-surface p-4 text-center transition-colors duration-200 hover:border-primary hover:bg-surface-2">
                {learned.has(s.label) && (
                  <CheckCircle2 className="absolute right-3 top-3 size-6 text-accent" aria-label="Recognised in practice" />
                )}
                <HandSign shape={s.media.shape} className="h-28 w-22" />
                <span className="mt-3 text-lg font-bold leading-tight">{s.phrase}</span>
                <span className="mt-1 text-[0.95rem] text-muted">{s.gesture}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* SASL roadmap */}
      <section aria-labelledby="sasl" className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sasl" className="text-2xl font-bold">South African Sign Language</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm font-bold text-text">
            <Clock className="size-4" aria-hidden="true" /> Coming later
          </span>
        </div>
        <p className="mt-2 text-muted">
          SASL is one of South Africa’s official languages. A sign’s meaning comes from handshape, movement, position and facial
          expression together, so these lessons will use video of Deaf SASL signers rather than drawings alone.
        </p>

        <ul className="mt-5 space-y-3">
          {SASL_MODULES.map((m) => (
            <li key={m.id} className="card flex items-start gap-4 p-4 opacity-90">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
                {m.media === 'Signer video'
                  ? <Video className="size-6 text-muted" aria-hidden="true" />
                  : <Hand className="size-6 text-muted" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold">{m.title}</h3>
                <p className="text-muted">{m.body}</p>
                <p className="mt-1 text-sm text-muted">{m.count} signs · {m.media}</p>
              </div>
              <Lock className="mt-1 size-5 shrink-0 text-muted" aria-label="Not available yet" />
            </li>
          ))}
        </ul>
      </section>

      <AnimatePresence>
        {open && <SignDetail key={open.label} sign={open} learned={learned.has(open.label)} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </>
  );
}
