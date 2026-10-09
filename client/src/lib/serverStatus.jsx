// The free API host sleeps when idle and takes up to a minute to wake. The page
// itself is served from a static host that never sleeps, so on load we start
// waking the API immediately and tell people what's happening if it's slow.
import { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE } from './api.js';

const ServerStatusContext = createContext('ready');

const SLOW_AFTER_MS = 1500;   // only mention waking up if it isn't instant
const GIVE_UP_AFTER_MS = 150_000;

export function ServerStatusProvider({ children }) {
  const [status, setStatus] = useState('checking'); // checking | waking | ready | offline

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const slowTimer = setTimeout(() => !cancelled && setStatus((s) => (s === 'checking' ? 'waking' : s)), SLOW_AFTER_MS);

    (async () => {
      while (!cancelled && Date.now() - started < GIVE_UP_AFTER_MS) {
        try {
          const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
          if (res.ok) { if (!cancelled) setStatus('ready'); return; }
        } catch { /* still asleep or starting; try again */ }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) setStatus('offline');
    })();

    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, []);

  return <ServerStatusContext.Provider value={status}>{children}</ServerStatusContext.Provider>;
}

export const useServerStatus = () => useContext(ServerStatusContext);
