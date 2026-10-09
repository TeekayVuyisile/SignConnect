import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { Alert, Field, Logo, MODES } from '../components/ui.jsx';
import ServerNotice from '../components/ServerNotice.jsx';

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-dvh px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <Link to="/" className="btn -ml-3 px-3 text-muted hover:bg-surface-2">
            <ArrowLeft className="size-5" aria-hidden="true" /> Back
          </Link>
          <Logo className="text-lg" />
        </div>
        <main className="mt-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-muted text-lg">{subtitle}</p>
          <ServerNotice className="mt-6" />
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-muted">{footer}</p>
        </main>
      </div>
    </div>
  );
}

function useAuthForm(path, initial) {
  const { acceptSession } = useSession();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const bind = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e) => { setValues((v) => ({ ...v, [name]: e.target.value })); setErrors((er) => ({ ...er, [name]: undefined })); },
  });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      acceptSession(await api(path, { method: 'POST', body: values }));
    } catch (err) {
      setErrors(err.fields ?? {});
      setFormError(err.message);
      setBusy(false);
    }
  };
  return { values, setValues, bind, submit, busy, formError };
}

export function Login() {
  const { bind, submit, busy, formError } = useAuthForm('/auth/login', { email: '', password: '' });
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to call your contacts."
      footer={<>New to SignConnect? <Link to="/register" className="font-bold text-primary underline underline-offset-4">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {formError && <Alert>{formError}</Alert>}
        <Field label="Email" type="email" autoComplete="email" inputMode="email" required {...bind('email')} />
        <Field label="Password" type="password" autoComplete="current-password" required {...bind('password')} />
        <button type="submit" className="btn-primary w-full text-lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const { values, setValues, bind, submit, busy, formError } = useAuthForm('/auth/register', {
    name: '', email: '', password: '', communication_mode: 'speech',
  });
  return (
    <AuthLayout title="Create your account" subtitle="It takes a minute. You can change everything later."
      footer={<>Already have an account? <Link to="/login" className="font-bold text-primary underline underline-offset-4">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {formError && <Alert>{formError}</Alert>}
        <Field label="Your name" autoComplete="name" required {...bind('name')} />
        <Field label="Email" type="email" autoComplete="email" inputMode="email" required {...bind('email')} />
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." required {...bind('password')} />

        <fieldset>
          <legend className="field-label">How do you mostly communicate?</legend>
          <p className="-mt-1 mb-3 text-[0.95rem] text-muted">We’ll set up captions and translation to match.</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(MODES).map(([key, { long, icon: Icon }]) => {
              const active = values.communication_mode === key;
              return (
                <label key={key}
                  className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-2 text-center font-bold transition-colors duration-200 cursor-pointer
                    has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]
                    ${active ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-2'}`}>
                  <input type="radio" name="communication_mode" value={key} checked={active} className="sr-only"
                    onChange={() => setValues((v) => ({ ...v, communication_mode: key }))} />
                  <Icon className={`size-7 ${active ? 'text-primary' : 'text-muted'}`} aria-hidden="true" />
                  {long}
                </label>
              );
            })}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary w-full text-lg" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthLayout>
  );
}
