import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { useCalls } from '../lib/calls.jsx';
import { Avatar, ModeBadge } from './ui.jsx';

/**
 * Full-screen incoming call. Deaf users may not hear a ringtone, so it also
 * vibrates on phones and flashes the tab title.
 */
export default function IncomingCall() {
  const { call, acceptCall, declineCall } = useCalls();
  const navigate = useNavigate();
  const acceptRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const ringing = call.phase === 'incoming';

  useEffect(() => {
    if (!ringing) return;
    acceptRef.current?.focus();
    const original = document.title;
    let flip = false;
    const titleTimer = setInterval(() => {
      flip = !flip;
      document.title = flip ? `Incoming call: ${call.peer?.name}` : original;
    }, 1000);
    const buzz = () => navigator.vibrate?.([400, 200, 400]);
    buzz();
    const vibeTimer = setInterval(buzz, 2000);
    return () => {
      clearInterval(titleTimer);
      clearInterval(vibeTimer);
      navigator.vibrate?.(0);
      document.title = original;
      setBusy(false);
    };
  }, [ringing, call.peer?.name]);

  if (!ringing) return null;

  const accept = async () => {
    setBusy(true);
    const res = await acceptCall();
    if (!res?.error) navigate('/call');
    else setBusy(false);
  };

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="incoming-title" aria-describedby="incoming-desc"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#062A33] px-6 py-[max(3rem,env(safe-area-inset-top))] text-white">
      <div className="mt-8 flex flex-col items-center gap-5 text-center">
        <p id="incoming-desc" className="text-lg font-bold text-cyan-100">Incoming video call</p>
        <span className="ring-pulse rounded-full"><Avatar name={call.peer?.name} size="xl" /></span>
        <h2 id="incoming-title" className="text-4xl font-bold">{call.peer?.name}</h2>
        <ModeBadge mode={call.peer?.communication_mode} />
      </div>

      <div className="mb-6 flex w-full max-w-sm items-start justify-around">
        <div className="flex flex-col items-center gap-3">
          <button onClick={declineCall} disabled={busy}
            className="flex size-20 items-center justify-center rounded-full bg-[#DC2626] text-white transition-colors duration-200 hover:bg-[#B91C1C] disabled:opacity-60">
            <PhoneOff className="size-9" aria-hidden="true" />
            <span className="sr-only">Decline call from {call.peer?.name}</span>
          </button>
          <span className="text-lg font-bold" aria-hidden="true">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <button ref={acceptRef} onClick={accept} disabled={busy}
            className="flex size-20 items-center justify-center rounded-full bg-[#10B981] text-[#022C22] transition-colors duration-200 hover:bg-[#34D399] disabled:opacity-60">
            <Phone className="size-9" aria-hidden="true" />
            <span className="sr-only">Accept call from {call.peer?.name}</span>
          </button>
          <span className="text-lg font-bold" aria-hidden="true">{busy ? 'Joining…' : 'Accept'}</span>
        </div>
      </div>
    </div>
  );
}
