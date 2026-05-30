'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContext {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthContext>({
  user: null, token: null, login: () => {}, logout: () => {}, loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('grievora_token');
    const u = localStorage.getItem('grievora_user');
    if (t && u) {
      setToken(t);
      try { setUser(JSON.parse(u)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (t: string, u: User) => {
    localStorage.setItem('grievora_token', t);
    localStorage.setItem('grievora_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('grievora_token');
    localStorage.removeItem('grievora_user');
    setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, token, login, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
