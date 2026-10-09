import { useEffect, useState } from 'react';
import { Captions, CheckCircle2, Hand, LogOut, Monitor, Moon, ShieldCheck, Sun, Volume2, XCircle } from 'lucide-react';
import { useSession } from '../lib/session.jsx';
import { speechRecognitionSupported } from '../hooks/useSpeechCaptions.js';
import { ttsSupported, speak } from '../lib/tts.js';
import { Alert, MODES, Switch } from '../components/ui.jsx';

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

export default function Settings() {
  const { user, preferences: p, updatePreferences, signOut } = useSession();
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
    </div>
  );
}

