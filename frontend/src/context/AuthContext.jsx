import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const store = {
  get: () => { try { return localStorage.getItem(api.TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(api.TOKEN_KEY, t); } catch { /* abaikan */ } },
  clear: () => { try { localStorage.removeItem(api.TOKEN_KEY); } catch { /* abaikan */ } },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(store.get()));

  const logout = useCallback(() => { store.clear(); setUser(null); }, []);

  // Pulihkan sesi saat halaman dibuka ulang
  useEffect(() => {
    if (!store.get()) return;
    api.getMe().then(setUser).catch(() => store.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener("qe:unauthorized", logout);
    return () => window.removeEventListener("qe:unauthorized", logout);
  }, [logout]);

  const accept = useCallback(({ token, user: u }) => { store.set(token); setUser(u); return u; }, []);
  const signIn = useCallback((payload) => api.login(payload).then(accept), [accept]);
  const signUp = useCallback((payload) => api.register(payload).then(accept), [accept]);

  const value = useMemo(() => ({ user, loading, signIn, signUp, logout }), [user, loading, signIn, signUp, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
