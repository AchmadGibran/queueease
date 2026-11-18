import axios from "axios";

export const TOKEN_KEY = "queueease_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* abaikan */ }
  return config;
});

// Sesi habis / token tidak valid → beri tahu AuthContext agar logout otomatis
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !url.startsWith("/auth/login") && !url.startsWith("/auth/register")) {
      window.dispatchEvent(new Event("qe:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (err, fallback = "Terjadi kesalahan.") =>
  err.response?.data?.message || (err.request ? "Tidak dapat terhubung ke server. Pastikan backend berjalan." : fallback);

const data = (p) => p.then((r) => r.data);

// Auth
export const login = (payload) => data(api.post("/auth/login", payload));
export const register = (payload) => data(api.post("/auth/register", payload));
export const getMe = () => data(api.get("/auth/me"));

// Publik
export const getLayanan = () => data(api.get("/layanan"));

// Mahasiswa
export const getMyQueue = () => data(api.get("/queue/me"));
export const getMyHistory = () => data(api.get("/queue/me/riwayat"));
export const createQueue = (payload) => data(api.post("/queue", payload));
export const cancelQueue = (id) => data(api.patch(`/queue/${id}/cancel`));

// Petugas
export const getQueue = (layananId) => data(api.get("/queue", { params: layananId ? { layanan_id: layananId } : {} }));
export const getStats = () => data(api.get("/queue/stats"));
export const callNext = (layananId) => data(api.patch("/queue/call-next", { layanan_id: layananId }));
export const callTicket = (id) => data(api.patch(`/queue/${id}/call`));
export const recallTicket = (id) => data(api.patch(`/queue/${id}/recall`));
export const completeQueue = (id) => data(api.patch(`/queue/${id}/done`));
export const skipQueue = (id) => data(api.patch(`/queue/${id}/skip`));
export const setMode = (mode) => data(api.patch("/layanan/mode", { mode }));
export const setLayananAktif = (id, aktif) => data(api.patch(`/layanan/${id}/aktif`, { aktif }));
