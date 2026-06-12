// Auth context. Holds the signed-in user and exposes sign-in / sign-up /
// demo-login / logout. On mount it restores the session from a stored token.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import * as api from "@/lib/api";
import type { AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!api.getToken()) {
      setLoading(false);
      return;
    }
    api
      .fetchMe()
      .then((u) => active && setUser(u))
      .catch(() => {
        api.logout();
        if (active) setUser(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const signup = async (email: string, password: string, name?: string) => setUser(await api.signup(email, password, name));
  const login = async (email: string, password: string) => setUser(await api.login(email, password));
  const demoLogin = async () => setUser(await api.demoLogin());
  const logout = () => {
    api.logout();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signup, login, demoLogin, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
