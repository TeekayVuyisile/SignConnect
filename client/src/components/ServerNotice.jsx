import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Hand, Loader2, ServerCrash } from 'lucide-react';
import { useServerStatus } from '../lib/serverStatus.jsx';

/** Explains a slow first load on free hosting. Hidden once the server responds. */
export default function ServerNotice({ showDemoLink = true, className = '' }) {
  const status = useServerStatus();
  const reduce = useReducedMotion();
  const visible = status === 'waking' || status === 'offline';

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          role="status"
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`flex gap-3 rounded-2xl bg-warning-soft p-4 text-warning-text ${className}`}
        >
          {status === 'waking'
            ? <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" aria-hidden="true" />
            : <ServerCrash className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="font-bold">
              {status === 'waking' ? 'Waking up the demo server…' : 'The server isn’t responding right now.'}
            </p>
            <p className="mt-0.5 text-[0.95rem]">
              {status === 'waking'
                ? 'It runs on free hosting that sleeps when idle, so the first visit can take up to a minute.'
                : 'Please try again in a few minutes.'}
              {showDemoLink && (
                <>
                  {' '}
                  <Link to="/demo" className="inline-flex items-center gap-1 font-bold underline underline-offset-4">
                    <Hand className="size-4" aria-hidden="true" />Try the sign demo meanwhile
                  </Link>
                  {' '}(no server needed).
                </>
              )}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
