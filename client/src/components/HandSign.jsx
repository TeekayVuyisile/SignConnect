import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { REST_SHAPE } from '../lib/signVocabulary.js';

/*
 * A parametric, stylised hand drawn in SVG, palm towards the viewer. It's shown
 * as the user sees themselves in a selfie camera (mirrored), so the thumb sits
 * on the left. It animates from a relaxed pose into the target handshape.
 */

const BASE_Y = 130; // where fingers meet the palm
const FINGERS = [
  { key: 'index', cx: 67, w: 22, len: 80, spread: -8 },
  { key: 'middle', cx: 92, w: 22, len: 90, spread: -2 },
  { key: 'ring', cx: 117, w: 22, len: 83, spread: 4 },
  { key: 'pinky', cx: 140, w: 19, len: 64, spread: 11 },
];
const THUMB_PIVOT = { x: 60, y: 186 };
const THUMB = {
  out: { angle: -52, len: 68 },
  up: { angle: -6, len: 86 },
  tucked: { angle: 48, len: 50 },
};
const SPRING = { type: 'spring', stiffness: 260, damping: 24 };

function fingerGeometry(state, len, relaxed) {
  if (state === 'curled') return { y: BASE_Y - 16, height: 44 };
  const l = relaxed ? len * 0.78 : len;
  return { y: BASE_Y - l, height: l + 14 };
}

/** Topmost y the shape reaches, so short shapes (fists) can be centred in the frame. */
function shapeTop(shape, thumb) {
  const fingerTops = FINGERS.map((f) => fingerGeometry(shape[f.key], f.len, shape.relaxed).y);
  const thumbTip = THUMB_PIVOT.y - thumb.len * Math.cos((thumb.angle * Math.PI) / 180) - 12;
  return Math.min(120, thumbTip, ...fingerTops);
}

function Hand({ shape, reduce }) {
  const thumb = THUMB[shape.thumb] ?? THUMB.out;
  const transition = reduce ? { duration: 0 } : SPRING;
  const cssTransition = reduce ? 'none' : 'transform 380ms cubic-bezier(.2,.8,.2,1)';
  const offset = shapeTop(shape, thumb) / 2 - 4;

  return (
    <g strokeWidth="4" strokeLinejoin="round"
      style={{ stroke: 'var(--hand-line)', transform: `translateY(${-offset}px)`, transition: cssTransition }}>
      {/* wrist + palm */}
      <rect x="68" y="196" width="68" height="60" rx="16" style={{ fill: 'var(--hand-fill)' }} />
      <rect x="46" y="120" width="112" height="98" rx="32" style={{ fill: 'var(--hand-fill)' }} />

      {FINGERS.map((f) => {
        const state = shape[f.key];
        const geo = fingerGeometry(state, f.len, shape.relaxed);
        const angle = shape.spread && state === 'up' ? f.spread : 0;
        return (
          <g key={f.key} style={{
            transformBox: 'view-box', transformOrigin: `${f.cx}px ${BASE_Y + 8}px`,
            transform: `rotate(${angle}deg)`, transition: cssTransition,
          }}>
            <motion.rect
              x={f.cx - f.w / 2} width={f.w} rx={f.w / 2}
              initial={false}
              animate={{ y: geo.y, height: geo.height }}
              transition={transition}
              style={{ fill: state === 'curled' ? 'var(--hand-fold)' : 'var(--hand-fill)' }}
            />
          </g>
        );
      })}

      {/* thumb, drawn last so a tucked thumb crosses the folded fingers */}
      <g style={{
        transformBox: 'view-box', transformOrigin: `${THUMB_PIVOT.x}px ${THUMB_PIVOT.y}px`,
        transform: `rotate(${thumb.angle}deg)`, transition: cssTransition,
      }}>
        <motion.rect
          x={THUMB_PIVOT.x - 12} width="24" rx="12"
          initial={false}
          animate={{ y: THUMB_PIVOT.y - thumb.len, height: thumb.len + 12 }}
          transition={transition}
          style={{ fill: 'var(--hand-fill)' }}
        />
      </g>
    </g>
  );
}

/**
 * @param shape   target handshape (see signVocabulary.js)
 * @param loop    repeat rest → sign so learners can watch it form
 * @param label   accessible description, e.g. "Thumbs up handshape"
 */
export default function HandSign({ shape, loop = false, label, className = '' }) {
  const reduce = useReducedMotion();
  const [formed, setFormed] = useState(reduce || !loop);

  useEffect(() => {
    if (reduce || !loop) { setFormed(true); return; }
    let t;
    const cycle = (isFormed) => {
      setFormed(isFormed);
      t = setTimeout(() => cycle(!isFormed), isFormed ? 2600 : 700);
    };
    t = setTimeout(() => cycle(true), 350);
    return () => clearTimeout(t);
  }, [loop, reduce, shape]);

  const pose = formed ? shape : { ...REST_SHAPE, rotate: shape.rotate };
  const waving = formed && shape.wave && !reduce;

  return (
    <motion.div
      className={`inline-block ${className}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      initial={false}
      animate={{ rotate: shape.rotate ?? 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4 }}
    >
      <motion.svg
        viewBox="0 0 200 260"
        className="size-full overflow-visible"
        style={{ originX: 0.5, originY: 0.95 }}
        animate={waving ? { rotate: [0, -12, 10, -12, 0] } : { rotate: 0 }}
        transition={waving ? { duration: 1.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 } : { duration: 0.3 }}
        aria-hidden="true"
      >
        <Hand shape={pose} reduce={reduce} />
      </motion.svg>
    </motion.div>
  );
}
