import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../services/api";
import { cacheClear } from "../utils/cache";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const USER_KEY = "queueease_user";
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* abaikan */ } };
const remove = (k) => { try { localStorage.removeItem(k); } catch { /* abaikan */ } };

const store = {
  token: () => read(api.TOKEN_KEY),
  user: () => { try { return read(api.TOKEN_KEY) ? JSON.parse(read(USER_KEY)) : null; } catch { return null; } },
  save: (token, user) => { write(api.TOKEN_KEY, token); write(USER_KEY, JSON.stringify(user)); },
  clear: () => { remove(api.TOKEN_KEY); remove(USER_KEY); cacheClear(); },
};

export function AuthProvider({ children }) {
  // Pengguna terakhir dipakai dulu supaya halaman langsung tampil; keabsahan token dicek di latar belakang.
  const [user, setUser] = useState(store.user);
  const [loading, setLoading] = useState(Boolean(store.token()) && !user);

  const logout = useCallback(() => { store.clear(); setUser(null); }, []);

  useEffect(() => {
    if (!store.token()) return;
    api.getMe()
      .then((u) => { write(USER_KEY, JSON.stringify(u)); setUser(u); })
      .catch((err) => { if (err.response?.status === 401) logout(); })
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener("qe:unauthorized", logout);
    return () => window.removeEventListener("qe:unauthorized", logout);
  }, [logout]);

  const accept = useCallback(({ token, user: u }) => { cacheClear(); store.save(token, u); setUser(u); return u; }, []);
  const signIn = useCallback((payload) => api.login(payload).then(accept), [accept]);
  const signUp = useCallback((payload) => api.register(payload).then(accept), [accept]);

  const value = useMemo(() => ({ user, loading, signIn, signUp, logout }), [user, loading, signIn, signUp, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
