import { useId } from 'react';
import { Hand, Keyboard, Mic } from 'lucide-react';

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-bold text-xl tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        <path d="M9 21.5c0-3 1.6-5 4-5h1.5M23 10.5c0 3-1.6 5-4 5h-1.5" stroke="var(--on-primary)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="16" cy="16" r="2.2" fill="var(--on-primary)" />
      </svg>
      SignConnect
    </span>
  );
}

const PALETTE = ['#0E7490', '#047857', '#7C2D12', '#4338CA', '#9D174D', '#1D4ED8', '#854D0E'];
export function Avatar({ name = '?', size = 'md', online }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const color = PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  const sizes = { sm: 'size-10 text-base', md: 'size-12 text-lg', lg: 'size-24 text-4xl', xl: 'size-32 text-5xl' };
  return (
    <span className="relative inline-flex shrink-0">
      <span className={`${sizes[size]} inline-flex items-center justify-center rounded-full font-bold text-white`} style={{ background: color }} aria-hidden="true">
        {initials}
      </span>
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 size-4 rounded-full border-[3px] border-surface ${online ? 'bg-accent' : 'bg-muted'}`} aria-hidden="true" />
      )}
    </span>
  );
}

export const MODES = {
  sign: { label: 'Signs', long: 'Sign language', icon: Hand },
  speech: { label: 'Speaks', long: 'Speech', icon: Mic },
  text: { label: 'Types', long: 'Text', icon: Keyboard },
};

export function ModeBadge({ mode }) {
  const m = MODES[mode] ?? MODES.speech;
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold text-text">
      <Icon className="size-4" aria-hidden="true" /> {m.label}
    </span>
  );
}

export function Switch({ label, description, checked, onChange, disabled, icon: Icon }) {
  const id = useId();
  return (
    <div className="flex items-center gap-4 py-3">
      {Icon && <Icon className="size-6 shrink-0 text-primary" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block font-bold">{label}</label>
        {description && <p id={`${id}-d`} className="text-muted text-[0.95rem] leading-snug">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border-2 transition-colors duration-200 disabled:opacity-50
          ${checked ? 'bg-primary border-primary' : 'bg-surface-2 border-border'}`}
      >
        <span className={`inline-block size-6 rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-8 bg-on-primary' : 'translate-x-1 bg-muted'}`} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

export function Field({ label, error, hint, ...props }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        className="field"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
        {...props}
      />
      {hint && !error && <p id={`${id}-h`} className="mt-1.5 text-sm text-muted">{hint}</p>}
      {error && <p id={`${id}-e`} className="mt-1.5 font-bold text-danger text-[0.95rem]">{error}</p>}
    </div>
  );
}

export function Alert({ children, tone = 'error' }) {
  const styles = tone === 'error'
    ? 'border-danger text-text bg-surface'
    : 'border-transparent bg-warning-soft text-warning-text';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl border-2 px-4 py-3 font-bold ${styles}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <span role="status" className="inline-flex items-center gap-3 text-muted">
      <span className="size-6 animate-spin rounded-full border-[3px] border-border border-t-primary" aria-hidden="true" />
      <span>{label}…</span>
    </span>
  );
}
