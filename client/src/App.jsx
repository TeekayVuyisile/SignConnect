import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './lib/session.jsx';
import { CallProvider } from './lib/calls.jsx';
import AppShell from './components/AppShell.jsx';
import IncomingCall from './components/IncomingCall.jsx';
import { Spinner } from './components/ui.jsx';
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
  return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
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
            <Route path="/practice" element={<RequireAuth><Suspense fallback={<FullPageSpinner />}><Practice /></Suspense></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <IncomingCall />
        </CallProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
