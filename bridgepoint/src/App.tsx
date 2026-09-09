import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TopBar } from './components';
import { useSession } from './context/SessionContext';
import { seedIfEmpty } from './services';
import {
  NewReferralPage,
  PartnerInboxPage,
  PartnerLinkPage,
  PartnersPage,
  ReferralDetailPage,
  SignInPage,
  StaffDashboardPage,
} from './pages';

/** Routes that need a signed-in user; the partner link page deliberately does not. */
function RequireSession({ children }: { children: JSX.Element }) {
  const { session } = useSession();
  if (!session) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { session } = useSession();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfEmpty().finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="container empty">Loading&hellip;</div>;

  /** The partner link page is standalone -- no nav chrome for an unauthenticated visitor. */
  const isPartnerLink = location.pathname.startsWith('/r/');

  return (
    <div className="app-shell">
      {!isPartnerLink && <TopBar />}
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <Navigate to={session.role === 'staff' ? '/referrals' : '/inbox'} replace />
            ) : (
              <SignInPage />
            )
          }
        />
        <Route path="/r/:token" element={<PartnerLinkPage />} />
        <Route
          path="/referrals"
          element={
            <RequireSession>
              <StaffDashboardPage />
            </RequireSession>
          }
        />
        <Route
          path="/referrals/new"
          element={
            <RequireSession>
              <NewReferralPage />
            </RequireSession>
          }
        />
        <Route
          path="/referrals/:id"
          element={
            <RequireSession>
              <ReferralDetailPage />
            </RequireSession>
          }
        />
        <Route
          path="/inbox"
          element={
            <RequireSession>
              <PartnerInboxPage />
            </RequireSession>
          }
        />
        <Route
          path="/partners"
          element={
            <RequireSession>
              <PartnersPage />
            </RequireSession>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
