import { Link } from 'react-router-dom';
import { Captions, Hand, Keyboard, Lock, Mic, Smartphone, Volume2 } from 'lucide-react';
import { Logo } from '../components/ui.jsx';
import ServerNotice from '../components/ServerNotice.jsx';

function CallPreview() {
  // A static, decorative rendering of the call screen.
  return (
    <div aria-hidden="true" className="relative mx-auto w-[min(100%,20rem)] rounded-[2.5rem] border-[10px] border-[#0b1d23] bg-[#0b1d23] shadow-2xl">
      <div className="relative aspect-[9/17] overflow-hidden rounded-[1.9rem] bg-gradient-to-b from-[#12414d] to-[#06171c]">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4 text-[0.8rem] font-bold text-white">
          <span>Thandi M.</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-0.5"><span className="size-2 rounded-full bg-[#F87171]" />Live 04:32</span>
        </div>
        <div className="absolute left-1/2 top-[22%] flex size-28 -translate-x-1/2 items-center justify-center rounded-full bg-[#047857] text-4xl font-bold text-white">TM</div>
        <div className="absolute right-3 top-12 h-24 w-16 rounded-xl border-2 border-white/30 bg-[#1e5664]" />
        <div className="absolute inset-x-3 bottom-20 space-y-2 rounded-2xl bg-black/75 p-3 text-white">
          <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-cyan-200"><Mic className="size-3.5" />Thandi · speech</p>
          <p className="text-[0.95rem] leading-snug">Are you free for the meeting tomorrow?</p>
          <p className="flex items-center gap-1.5 pt-1 text-[0.7rem] font-bold uppercase tracking-wider text-emerald-300"><Hand className="size-3.5" />You · sign · 91%</p>
          <p className="text-[0.95rem] leading-snug">Yes</p>
        </div>
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2.5">
          {['#ffffff26', '#ffffff26', '#22d3ee', '#ffffff26', '#DC2626'].map((c, i) => (
            <span key={i} className="size-10 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}

const WAYS = [
  { icon: Hand, title: 'Sign', body: 'Your signs are recognised on your phone and shown to the other person as text, or read aloud.' },
  { icon: Mic, title: 'Speak', body: 'Speech turns into live captions as you talk, so nobody waits for you to finish.' },
  { icon: Keyboard, title: 'Type', body: 'Prefer typing? Send a quick message mid-call and it appears as a caption.' },
];

const DETAILS = [
  { icon: Lock, title: 'Your video stays with you', body: 'Calls go directly between devices. Sign recognition runs on your own phone, and your camera feed is never uploaded for AI processing.' },
  { icon: Captions, title: 'Honest captions', body: 'Every sign translation shows how confident it is. When it’s unsure, it says “possibly” rather than guessing.' },
  { icon: Volume2, title: 'Read or listen', body: 'Hearing participants can have sign translations spoken aloud, so they don’t need to watch the screen.' },
  { icon: Smartphone, title: 'Made for phones', body: 'Big buttons, large adjustable captions, vibration for incoming calls, and dark mode.' },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <Logo />
        <Link to="/login" className="btn px-4 text-text hover:bg-surface-2">Sign in</Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-6 md:grid-cols-[1.15fr_1fr] md:pt-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 font-bold text-text">
              <Hand className="size-4 text-accent" aria-hidden="true" /> Built with South African Sign Language in mind
            </p>
            <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.1] md:text-6xl">
              Talk your way.<br />
              <span className="text-primary">Be understood.</span>
            </h1>
            <p className="mt-5 max-w-[34rem] text-lg text-muted md:text-xl">
              SignConnect is a video call where everyone uses the language that suits them. Sign, speak or type, and the other
              person reads live captions, sign translations or hears them aloud.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/demo" className="btn-accent px-7 text-lg">
                <Hand className="size-5" aria-hidden="true" /> Try the sign demo
              </Link>
              <Link to="/register" className="btn-primary px-7 text-lg">Create a free account</Link>
            </div>
            <p className="mt-3 text-muted">
              The demo needs no account, just your camera.{' '}
              <Link to="/login" className="font-bold text-primary underline underline-offset-4">Sign in</Link> if you already have one.
            </p>
            <ServerNotice showDemoLink={false} className="mt-5 max-w-[34rem]" />
          </div>
          <CallPreview />
        </section>

        <section aria-labelledby="ways" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 id="ways" className="text-3xl font-bold md:text-4xl">Three ways in. One conversation.</h2>
            <p className="mt-3 max-w-[40rem] text-lg text-muted">
              Each person chooses for themselves, and Deaf-to-Deaf calls work as plain video with no translation forced in.
            </p>
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {WAYS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-3xl bg-bg p-6">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-on-primary">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="details" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="details" className="sr-only">Why SignConnect</h2>
          <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2">
            {DETAILS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <Icon className="mt-1 size-7 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-1.5 text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-14 rounded-3xl bg-warning-soft p-6 text-warning-text">
            <h3 className="text-lg font-bold">Early preview: sign recognition</h3>
            <p className="mt-1.5">
              Today, sign mode understands a small set of hand gestures (such as hello, yes, no and thank you). It doesn’t
              understand full SASL yet. We’re building a proper SASL vocabulary with Deaf signers. Captions for speech already
              work in full.
            </p>
          </div>
        </section>

        <section className="bg-primary text-on-primary">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
            <h2 className="text-3xl font-bold">Ready for your first call?</h2>
            <Link to="/register" className="btn bg-on-primary px-7 text-lg text-primary hover:opacity-90">Get started</Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-muted">SignConnect · Real-time accessible calling</footer>
    </div>
  );
}
