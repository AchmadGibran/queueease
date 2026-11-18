import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, GraduationCap, Loader2, LogIn, Monitor, ShieldCheck, Ticket, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";

const input = "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("mahasiswa");
  const [mode, setMode] = useState("login"); // login | register (register hanya untuk mahasiswa)
  const [form, setForm] = useState({ identifier: "", nama: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isStaff = role === "petugas";
  const registering = !isStaff && mode === "register";
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const switchRole = (next) => { setRole(next); setMode("login"); setError(""); setForm({ identifier: "", nama: "", password: "", confirm: "" }); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (registering && form.password !== form.confirm) return setError("Konfirmasi password tidak sama.");
    setLoading(true);
    try {
      const user = registering
        ? await signUp({ nim: form.identifier, nama: form.nama, password: form.password })
        : await signIn({ role, identifier: form.identifier, password: form.password });
      navigate(user.role === "petugas" ? "/petugas" : "/mahasiswa", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Gagal masuk."));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-10">
      <div className="fixed right-4 top-4"><ThemeToggle className="bg-white" /></div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="rounded-2xl bg-blue-600 p-3.5 text-white shadow-lg shadow-blue-200"><Ticket size={28} /></div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">QueueEase</h1>
          <p className="text-sm text-slate-500">Sistem Antrean Digital Kampus</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-blue-100/50">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {[["mahasiswa", "Mahasiswa", GraduationCap], ["petugas", "Petugas", ShieldCheck]].map(([key, label, Icon]) => (
              <button key={key} type="button" onClick={() => switchRole(key)}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${role === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-bold text-slate-900">{isStaff ? "Login Petugas" : registering ? "Daftar Akun Mahasiswa" : "Login Mahasiswa"}</h2>
          <p className="mb-5 text-sm text-slate-500">
            {isStaff ? "Masuk untuk mengelola antrean (dashboard)" : registering ? "Gunakan NIM asli — satu NIM hanya untuk satu akun" : "Masuk dengan NIM untuk mengambil antrean"}
          </p>

          {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{isStaff ? "Username" : "NIM"}</label>
              <input required autoFocus value={form.identifier} onChange={set("identifier")} autoComplete="username"
                maxLength={isStaff ? 30 : 20} placeholder={isStaff ? "Masukkan username" : "Contoh: 2021110001"} className={input} />
            </div>
            {registering && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama lengkap</label>
                <input required minLength={3} maxLength={100} value={form.nama} onChange={set("nama")} placeholder="Sesuai KTM" className={input} />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input required type={showPass ? "text" : "password"} minLength={registering ? 6 : 1} maxLength={72} value={form.password} onChange={set("password")}
                  autoComplete={registering ? "new-password" : "current-password"} placeholder={registering ? "Minimal 6 karakter" : "Masukkan password"} className={`${input} pr-12`} />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label="Tampilkan password" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {registering && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Konfirmasi password</label>
                <input required type={showPass ? "text" : "password"} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" placeholder="Ulangi password" className={input} />
              </div>
            )}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : registering ? <UserPlus size={18} /> : <LogIn size={18} />}
              {loading ? "Memproses..." : registering ? "Daftar & Masuk" : "Masuk"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {isStaff ? "Akun petugas dibuat oleh admin sistem." : registering ? (
              <>Sudah punya akun? <button onClick={() => { setMode("login"); setError(""); }} className="font-semibold text-blue-600 hover:underline">Masuk</button></>
            ) : (
              <>Belum punya akun? <button onClick={() => { setMode("register"); setError(""); }} className="font-semibold text-blue-600 hover:underline">Daftar</button></>
            )}
          </p>
        </div>

        <Link to="/display" className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700">
          <Monitor size={16} /> Lihat layar antrean publik
        </Link>
      </div>
    </div>
  );
}
