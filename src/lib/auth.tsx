// Session state: who is signed in, and the actions that change it.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthResponse, User } from "@shared/contract.ts";
import { api, getToken, setToken } from "./api";

type Status = "checking" | "signed-in" | "signed-out";

interface Session {
  user: User | null;
  status: Status;
  startGuest: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>(() => (getToken() ? "checking" : "signed-out"));

  // Restore a stored session once, on load.
  useEffect(() => {
    if (!getToken()) return;
    let active = true;
    api
      .me()
      .then(({ user }) => {
        if (!active) return;
        setUser(user);
        setStatus("signed-in");
      })
      .catch(() => {
        if (!active) return;
        setToken(null);
        setStatus("signed-out");
      });
    return () => {
      active = false;
    };
  }, []);

  const accept = useCallback(({ token, user }: AuthResponse) => {
    setToken(token);
    setUser(user);
    setStatus("signed-in");
  }, []);

  const value = useMemo<Session>(
    () => ({
      user,
      status,
      startGuest: async () => accept(await api.guest()),
      login: async (email, password) => accept(await api.login(email, password)),
      signup: async (email, password, name) => accept(await api.signup(email, password, name)),
      signOut: () => {
        setToken(null);
        setUser(null);
        setStatus("signed-out");
      },
    }),
    [user, status, accept],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}
