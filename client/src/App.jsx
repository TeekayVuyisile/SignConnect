import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './lib/session.jsx';
import { CallProvider } from './lib/calls.jsx';
import AppShell from './components/AppShell.jsx';
import IncomingCall from './components/IncomingCall.jsx';
import { Spinner } from './components/ui.jsx';
import ServerNotice from './components/ServerNotice.jsx';
import { ServerStatusProvider } from './lib/serverStatus.jsx';
import Landing from './pages/Landing.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Contacts from './pages/Contacts.jsx';
import Recents from './pages/Recents.jsx';
import Settings from './pages/Settings.jsx';
import Learn from './pages/Learn.jsx';

// The call screen pulls in WebRTC + MediaPipe, so it loads on demand.
const Call = lazy(() => import('./pages/Call.jsx'));
const Practice = lazy(() => import('./pages/Practice.jsx'));

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <Spinner />
      <ServerNotice className="w-full max-w-md" />
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useSession();
  if (loading) return <FullPageSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useSession();
  if (loading) return <FullPageSpinner />;
  return user ? <Navigate to="/app" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ServerStatusProvider>
      <SessionProvider>
        <CallProvider>
          <Routes>
            <Route path="/" element={<GuestOnly><Landing /></GuestOnly>} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
              <Route index element={<Contacts />} />
              <Route path="recents" element={<Recents />} />
              <Route path="learn" element={<Learn />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/call" element={<RequireAuth><Suspense fallback={<FullPageSpinner />}><Call /></Suspense></RequireAuth>} />
            {/* Public: the sign AI runs fully in the browser, so it works before the API wakes. */}
            <Route path="/demo" element={<Suspense fallback={<FullPageSpinner />}><Practice guest /></Suspense>} />
            <Route path="/practice" element={<RequireAuth><Suspense fallback={<FullPageSpinner />}><Practice /></Suspense></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <IncomingCall />
        </CallProvider>
      </SessionProvider>
      </ServerStatusProvider>
    </BrowserRouter>
  );
}
