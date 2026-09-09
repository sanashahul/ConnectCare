/**
 * Who is using the app right now.
 *
 * Deliberately lightweight: this is identity for attribution and view routing,
 * not authentication. Real auth arrives with the backend -- until then the
 * session just records a name and which side of the referral you are on.
 */

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { read, write } from '../services/storage';

export type SessionRole = 'staff' | 'partner';

export interface Session {
  role: SessionRole;
  name: string;
  /** Referring organization, for staff sessions. */
  orgName?: string;
  /** Which partner organization this user works for, for partner sessions. */
  partnerOrgId?: string;
}

interface SessionContextValue {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

const SESSION_KEY = 'session';

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => read<Session | null>(SESSION_KEY, null));

  useEffect(() => {
    write(SESSION_KEY, session);
  }, [session]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signIn: setSession,
      signOut: () => setSession(null),
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside a SessionProvider.');
  return ctx;
}
