/**
 * Global auth context (JWT-based).
 * Token + user persisted with secure storage.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, TOKEN_STORAGE_KEY } from "@/src/api";
import { storage } from "@/src/utils/storage";

export type UserRole = "client" | "owner" | "admin";

export type User = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  created_at: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: "client" | "owner";
  }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const USER_KEY = "lobiimo_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback(async (tk: string | null, usr: User | null) => {
    if (tk) {
      await storage.secureSet(TOKEN_STORAGE_KEY, tk);
    } else {
      await storage.secureRemove(TOKEN_STORAGE_KEY);
    }
    if (usr) {
      await storage.setItem(USER_KEY, JSON.stringify(usr));
    } else {
      await storage.removeItem(USER_KEY);
    }
    setToken(tk);
    setUser(usr);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ token: string; user: User }>("/auth/login", {
        email,
        password,
      });
      await persist(res.token, res.user);
      return res.user;
    },
    [persist],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role: "client" | "owner";
    }) => {
      const res = await api.post<{ token: string; user: User }>(
        "/auth/register",
        input,
      );
      await persist(res.token, res.user);
      return res.user;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    await persist(null, null);
  }, [persist]);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
      await storage.setItem(USER_KEY, JSON.stringify(me));
    } catch {
      await persist(null, null);
    }
  }, [persist]);

  useEffect(() => {
    (async () => {
      const tk = await storage.secureGet<string>(TOKEN_STORAGE_KEY, "");
      const raw = await storage.getItem<string>(USER_KEY, "");
      if (tk) {
        setToken(tk);
        if (raw) {
          try {
            setUser(JSON.parse(raw));
          } catch {
            /* ignore */
          }
        }
        try {
          const me = await api.get<User>("/auth/me");
          setUser(me);
          await storage.setItem(USER_KEY, JSON.stringify(me));
        } catch {
          await persist(null, null);
        }
      }
      setLoading(false);
    })();
  }, [persist]);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, login, register, logout, refresh }),
    [user, token, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
