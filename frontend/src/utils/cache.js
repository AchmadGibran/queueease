import { useCallback, useState } from "react";

// Cache data terakhir di sessionStorage agar halaman langsung terisi saat dibuka/pindah/refresh,
// lalu diperbarui diam-diam oleh polling. Dihapus saat logout.
const P = "qe:";
export const cacheGet = (key, fallback) => {
  try { const v = sessionStorage.getItem(P + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
export const cacheSet = (key, value) => { try { sessionStorage.setItem(P + key, JSON.stringify(value)); } catch { /* abaikan */ } };
export const cacheClear = () => {
  try { Object.keys(sessionStorage).filter((k) => k.startsWith(P)).forEach((k) => sessionStorage.removeItem(k)); } catch { /* abaikan */ }
};

export function useCachedState(key, initial) {
  const [value, setValue] = useState(() => cacheGet(key, initial));
  const set = useCallback((next) => { setValue(next); cacheSet(key, next); }, [key]);
  return [value, set];
}
