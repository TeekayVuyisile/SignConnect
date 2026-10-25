import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, Captions, CheckCircle2, Hand, LogOut, Trash2, Monitor, Moon, ShieldCheck, Sun, Volume2, XCircle } from 'lucide-react';
import { useSession } from '../lib/session.jsx';
import { speechRecognitionSupported } from '../hooks/useSpeechCaptions.js';
import { ttsSupported, speak } from '../lib/tts.js';
import { Alert, Field, MODES, Switch } from '../components/ui.jsx';

function Section({ title, description, children }) {
  return (
    <section className="card p-5" aria-labelledby={`s-${title}`}>
      <h2 id={`s-${title}`} className="text-xl font-bold">{title}</h2>
      {description && <p className="mt-1 text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Segmented({ legend, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(({ value: v, label, icon: Icon, sample }) => {
          const active = value === v;
          return (
            <label key={v}
              className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-center font-bold transition-colors duration-200
                has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]
                ${active ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-2'}`}>
              <input type="radio" className="sr-only" name={legend} value={v} checked={active} onChange={() => onChange(v)} />
              {Icon && <Icon className={`size-6 ${active ? 'text-primary' : 'text-muted'}`} aria-hidden="true" />}
              {sample ? <span className={sample}>Aa</span> : null}
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Check({ ok, label, detail }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <li className="flex gap-3 py-2">
      <Icon className={`mt-0.5 size-6 shrink-0 ${ok ? 'text-accent' : 'text-danger'}`} aria-hidden="true" />
      <div>
        <p className="font-bold">{label}: <span className={ok ? 'text-accent' : 'text-danger'}>{ok ? 'Ready' : 'Not available'}</span></p>
        {!ok && detail && <p className="text-[0.95rem] text-muted">{detail}</p>}
      </div>
    </li>
  );
}

function DeviceCheck() {
  const [devices, setDevices] = useState(null);
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.()
      .then((list) => setDevices({
        camera: list.some((d) => d.kind === 'videoinput'),
        mic: list.some((d) => d.kind === 'audioinput'),
      }))
      .catch(() => setDevices({ camera: false, mic: false }));
  }, []);

  return (
    <ul>
      <Check ok={window.isSecureContext} label="Secure connection"
        detail="Open SignConnect over https:// so your browser allows the camera and microphone." />
      <Check ok={!!devices?.camera} label="Camera" detail="No camera found. You can still join calls and see the other person." />
      <Check ok={!!devices?.mic} label="Microphone" detail="No microphone found. You can still sign or type." />
      <Check ok={speechRecognitionSupported} label="Speech captions"
        detail="This browser can’t transcribe speech. Try Chrome on Android or desktop, or Safari on iPhone." />
      <Check ok={ttsSupported} label="Read aloud" detail="This browser can’t speak text aloud." />
    </ul>
  );
}

function DeleteAccountDialog({ email, onCancel, onDelete }) {
  const reduce = useReducedMotion();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onDelete(password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      onClick={() => !busy && onCancel()}>
      <motion.form role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc"
        onSubmit={submit} onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="w-full max-w-md rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-warning-soft">
          <AlertTriangle className="size-6 text-danger" aria-hidden="true" />
        </span>
        <h2 id="del-title" className="mt-3 text-2xl font-bold">Delete your account?</h2>
        <div id="del-desc" className="mt-2 text-muted">
          <p>This permanently deletes <span className="font-bold text-text">{email}</span> and can’t be undone:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>your profile and settings</li>
            <li>your contacts (you’ll disappear from their lists too)</li>
            <li>your call history</li>
          </ul>
        </div>
        <div className="mt-4">
          <Field label="Enter your password to confirm" type="password" autoComplete="current-password" autoFocus required
            value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} error={error} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>Keep my account</button>
          <button type="submit" className="btn-danger" disabled={busy || !password}>
            <Trash2 className="size-5" aria-hidden="true" /> {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

export default function Settings() {
  const { user, preferences: p, updatePreferences, signOut, deleteAccount } = useSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const set = (patch) => {
    setError(null);
    updatePreferences(patch).catch((e) => setError(e.message));
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">Settings</h1>
      {error && <Alert>{error}</Alert>}

      <Section title="How I communicate" description="Others see this on your contact card, and it sets your call defaults.">
        <Segmented legend="Communication mode" value={p.communication_mode} onChange={(v) => set({ communication_mode: v })}
          options={Object.entries(MODES).map(([value, m]) => ({ value, label: m.long, icon: m.icon }))} />
      </Section>

      <Section title="During calls">
        <div className="divide-y divide-border">
          <Switch icon={Captions} label="Show captions" description="Read what the other person says, signs or types."
            checked={p.show_captions} onChange={(v) => set({ show_captions: v })} />
          <Switch icon={Hand} label="Sign translation" description="Recognise my signs on this device and send them as text."
            checked={p.sign_translation} onChange={(v) => set({ sign_translation: v })} />
          <Switch icon={Volume2} label="Read translations aloud" description="Speak the other person’s signed or typed messages out loud."
            checked={p.text_to_speech} disabled={!ttsSupported} onChange={(v) => { set({ text_to_speech: v }); if (v) speak('Read aloud is on.'); }} />
        </div>
      </Section>

      <Section title="Caption size">
        <Segmented legend="Caption size" value={p.caption_size} onChange={(v) => set({ caption_size: v })}
          options={[
            { value: 'medium', label: 'Medium', sample: 'caption-medium' },
            { value: 'large', label: 'Large', sample: 'caption-large' },
            { value: 'xlarge', label: 'Extra large', sample: 'caption-xlarge' },
          ]} />
        <p className={`mt-4 rounded-2xl bg-[#0b1d23] px-4 py-3 text-white caption-${p.caption_size}`} aria-hidden="true">
          Are you free for the meeting tomorrow?
        </p>
      </Section>

      <Section title="Appearance">
        <Segmented legend="Theme" value={p.theme} onChange={(v) => set({ theme: v })}
          options={[
            { value: 'system', label: 'System', icon: Monitor },
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
          ]} />
      </Section>

      <Section title="Device check" description="What this browser supports right now.">
        <DeviceCheck />
        <p className="mt-2 flex items-start gap-2 text-[0.95rem] text-muted">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Sign recognition runs on this device. Your video is never uploaded for AI processing.
        </p>
      </Section>

      <Section title="Account">
        <p className="font-bold">{user.name}</p>
        <p className="text-muted">{user.email}</p>
        <button onClick={signOut} className="btn-ghost mt-4 w-full sm:w-auto">
          <LogOut className="size-5" aria-hidden="true" /> Sign out
        </button>
      </Section>

      <section className="rounded-3xl border-2 border-danger/50 p-5" aria-labelledby="danger-title">
        <h2 id="danger-title" className="text-xl font-bold">Delete account</h2>
        <p className="mt-1 text-muted">Permanently remove your account, contacts and call history.</p>
        <button onClick={() => setConfirmDelete(true)} className="btn mt-4 w-full border-2 border-danger text-danger hover:bg-danger hover:text-on-danger sm:w-auto">
          <Trash2 className="size-5" aria-hidden="true" /> Delete my account
        </button>
      </section>

      <AnimatePresence>
        {confirmDelete && (
          <DeleteAccountDialog email={user.email} onCancel={() => setConfirmDelete(false)} onDelete={deleteAccount} />
        )}
      </AnimatePresence>
    </div>
  );
}

