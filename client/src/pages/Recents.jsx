import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCalls } from '../lib/calls.jsx';
import { Alert, Avatar, Spinner } from '../components/ui.jsx';

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS".
const parse = (s) => (s ? new Date(`${s.replace(' ', 'T')}Z`) : null);

function when(date) {
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()) - new Date(date.toDateString())) / 86_400_000);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' }) + `, ${time}`;
}

function duration(a, b) {
  const secs = Math.max(0, Math.round((b - a) / 1000));
  const m = Math.floor(secs / 60);
  return m ? `${m} min ${secs % 60} s` : `${secs} s`;
}

function describe(c) {
  if (c.status === 'answered') {
    const a = parse(c.answered_at); const e = parse(c.ended_at);
    return { icon: c.direction === 'outgoing' ? PhoneOutgoing : PhoneIncoming, text: `${c.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}${e ? ` · ${duration(a, e)}` : ''}`, missed: false };
  }
  if (c.status === 'declined') return { icon: c.direction === 'outgoing' ? PhoneOutgoing : PhoneIncoming, text: c.direction === 'outgoing' ? 'Declined by them' : 'You declined', missed: false };
  if (c.direction === 'incoming') return { icon: PhoneMissed, text: 'Missed call', missed: true };
  return { icon: PhoneOutgoing, text: 'No answer', missed: false };
}

export default function Recents() {
  const [calls, setCalls] = useState(null);
  const [error, setError] = useState(null);
  const { startCall } = useCalls();
  const navigate = useNavigate();

  useEffect(() => { api('/calls').then(setCalls).catch((e) => setError(e.message)); }, []);

  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Recent calls</h1>
      {error && <Alert>{error}</Alert>}
      {!calls && !error && <Spinner label="Loading calls" />}

      {calls?.length === 0 && (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft">
            <Clock className="size-8 text-primary" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold">No calls yet</h2>
          <p className="mt-2 text-muted">Your call history will appear here.</p>
        </div>
      )}

      {calls?.length > 0 && (
        <ul className="card divide-y divide-border overflow-hidden" aria-label="Call history">
          {calls.map((c) => {
            const d = describe(c);
            const Icon = d.icon;
            return (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3.5">
                <Avatar name={c.peer_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-lg font-bold ${d.missed ? 'text-danger' : ''}`}>{c.peer_name}</p>
                  <p className={`flex items-center gap-1.5 text-[0.95rem] ${d.missed ? 'font-bold text-danger' : 'text-muted'}`}>
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span>{d.text}</span>
                  </p>
                  <p className="text-sm text-muted">{when(parse(c.started_at))}</p>
                </div>
                <button className="btn-ghost px-3" aria-label={`Call ${c.peer_name} back`}
                  onClick={() => { startCall({ id: c.peer_id, name: c.peer_name }); navigate('/call'); }}>
                  <Video className="size-6" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
