import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Video, X } from 'lucide-react';
import { api } from '../lib/api.js';
import { useCalls } from '../lib/calls.jsx';
import { useSession } from '../lib/session.jsx';
import { Alert, Avatar, Field, ModeBadge, Spinner } from '../components/ui.jsx';

function AddContact({ onAdded, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onAdded(await api('/contacts', { method: 'POST', body: { email } }));
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mb-6 space-y-4 p-5" aria-labelledby="add-title">
      <div className="flex items-center justify-between">
        <h2 id="add-title" className="text-xl font-bold">Add a contact</h2>
        <button type="button" onClick={onClose} className="btn -mr-2 px-0 text-muted hover:bg-surface-2">
          <X className="size-6" aria-hidden="true" /><span className="sr-only">Close</span>
        </button>
      </div>
      <Field label="Their email address" type="email" inputMode="email" autoComplete="off" autoFocus required
        value={email} onChange={(e) => setEmail(e.target.value)} error={error}
        hint="They need a SignConnect account. You’ll be added to their contacts too." />
      <button type="submit" className="btn-primary w-full" disabled={busy || !email}>{busy ? 'Adding…' : 'Add contact'}</button>
    </form>
  );
}

export default function Contacts() {
  const { user } = useSession();
  const { presence, startCall, call } = useCalls();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api('/contacts').then(setContacts).catch((e) => setLoadError(e.message));
  }, []);

  const list = useMemo(() => {
    if (!contacts) return [];
    const q = query.trim().toLowerCase();
    return contacts
      .map((c) => ({ ...c, online: presence[c.id] ?? c.online }))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.includes(q))
      .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  }, [contacts, presence, query]);

  const placeCall = (contact) => {
    startCall(contact);
    navigate('/call');
  };

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-muted">Hi {user.name.split(' ')[0]}</p>
          <h1 className="text-3xl font-bold">Contacts</h1>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary">
            <UserPlus className="size-5" aria-hidden="true" /> Add
          </button>
        )}
      </div>

      {adding && <AddContact onClose={() => setAdding(false)} onAdded={(c) => setContacts((cs) => [...(cs ?? []).filter((x) => x.id !== c.id), c])} />}

      {loadError && <Alert>{loadError}</Alert>}
      {!contacts && !loadError && <Spinner label="Loading contacts" />}

      {contacts?.length > 3 && (
        <div className="relative mb-4">
          <label htmlFor="contact-search" className="sr-only">Search contacts</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="contact-search" type="search" className="field pl-12" placeholder="Search contacts"
            value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {contacts?.length === 0 && !adding && (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft">
            <UserPlus className="size-8 text-primary" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-bold">No contacts yet</h2>
          <p className="mt-2 max-w-sm text-muted">Add someone by their email address. Testing on your own? Create a second account in another browser.</p>
          <button onClick={() => setAdding(true)} className="btn-primary mt-6">Add your first contact</button>
        </div>
      )}

      {list.length > 0 && (
        <ul className="card divide-y divide-border overflow-hidden" aria-label="Your contacts">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-4 px-4 py-3.5">
              <Avatar name={c.name} online={c.online} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{c.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <ModeBadge mode={c.communication_mode} />
                  <span className={`text-[0.95rem] ${c.online ? 'font-bold text-accent' : 'text-muted'}`}>{c.online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <button onClick={() => placeCall(c)} disabled={call.phase !== 'idle' && call.phase !== 'ended'}
                className={c.online ? 'btn-accent px-4' : 'btn-ghost px-4'}
                aria-label={`Video call ${c.name}${c.online ? '' : ' (offline)'}`}>
                <Video className="size-6" aria-hidden="true" />
                <span className="hidden sm:inline">Call</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {contacts?.length > 0 && list.length === 0 && <p className="text-muted">No contacts match “{query}”.</p>}
    </>
  );
}
