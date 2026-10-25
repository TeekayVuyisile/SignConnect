import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api.js';

const SessionContext = createContext(null);

function applyTheme(theme) {
  try { localStorage.setItem('sc-theme', theme); } catch { /* ignore */ }
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then(({ user, preferences }) => { setUser(user); setPreferences(preferences); })
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const theme = preferences?.theme ?? 'system';
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preferences?.theme]);

  const acceptSession = useCallback(({ token, user, preferences }) => {
    tokenStore.set(token);
    setUser(user);
    setPreferences(preferences);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setPreferences(null);
  }, []);

  const updatePreferences = useCallback(async (patch) => {
    setPreferences((p) => ({ ...p, ...patch })); // optimistic
    try {
      setPreferences(await api('/preferences', { method: 'PUT', body: patch }));
    } catch (err) {
      setPreferences(await api('/preferences').catch(() => null));
      throw err;
    }
  }, []);

  /** Permanently deletes the account (password-confirmed), then signs out locally. */
  const deleteAccount = useCallback(async (password) => {
    await api('/auth/me', { method: 'DELETE', body: { password } });
    try { localStorage.removeItem('sc-learned-signs'); } catch { /* ignore */ }
    signOut();
  }, [signOut]);

  const value = useMemo(
    () => ({ user, preferences, loading, acceptSession, signOut, updatePreferences, deleteAccount }),
    [user, preferences, loading, acceptSession, signOut, updatePreferences, deleteAccount],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
