import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, BellRing, Check, Eye, EyeOff, GraduationCap, Loader2, Lock, LogIn, Monitor, ShieldCheck, Ticket, Timer, User, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage, getLayanan } from "../services/api";
import ThemeToggle from "../components/ThemeToggle";

const field = "w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const label = "mb-1.5 block text-sm font-semibold text-slate-700";
const EMPTY = { identifier: "", nama: "", password: "", confirm: "" };

const FEATURES = [
  [Ticket, "Ambil nomor dari mana saja", "Pilih layanan, dapat nomor, tanpa antre fisik."],
  [Timer, "Estimasi waktu tunggu", "Lihat posisi dan perkiraan giliran Anda secara langsung."],
  [BellRing, "Diberi tahu saat dipanggil", "Notifikasi bunyi ketika nomor Anda tiba."],
];

function strength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  return s;
}

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("mahasiswa");
  const [mode, setMode] = useState("login"); // login | register (register hanya untuk mahasiswa)
  const [form, setForm] = useState(EMPTY);
  const [showPass, setShowPass] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(null);

  // Statistik publik kecil di panel kiri (tanpa login); diabaikan bila gagal
  useEffect(() => {
    getLayanan().then((l) => setWaiting(l.reduce((n, x) => n + x.waiting, 0))).catch(() => {});
  }, []);

  const isStaff = role === "petugas";
  const registering = !isStaff && mode === "register";
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const score = strength(form.password);

  const reset = () => { setError(""); setForm(EMPTY); setShowPass(false); };
  const switchRole = (next) => { setRole(next); setMode("login"); reset(); };
  const switchMode = (next) => { setMode(next); reset(); };

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
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Panel merek (desktop) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-2.5 ring-1 ring-white/30"><Ticket size={24} /></div>
          <span className="text-xl font-extrabold tracking-tight">QueueEase</span>
        </div>

        <div className="relative max-w-lg">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">Antrean tanpa harus menunggu lama.</h2>
          <p className="mt-4 text-blue-100">Sistem antrean digital pelayanan akademik kampus: cepat, transparan, dan terpantau langsung.</p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(([Icon, title, text]) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="rounded-xl bg-white/15 p-2.5 ring-1 ring-white/25"><Icon size={18} /></span>
                <span><span className="block font-semibold">{title}</span><span className="text-sm text-blue-100">{text}</span></span>
              </li>
            ))}
          </ul>

          <div className="mt-10 w-72 -rotate-3 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl shadow-blue-950/40">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-blue-600"><Ticket size={13} /> CONTOH NOMOR ANTREAN</p>
            <p className="mt-1 text-4xl font-black tracking-wider text-blue-700">KA-014</p>
            <p className="mt-1 text-xs text-slate-500">Konsultasi Akademik · 2 di depan · ± 20 menit</p>
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-4 text-sm text-blue-100">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
            {waiting === null ? "Layanan aktif hari ini" : `${waiting} orang sedang menunggu hari ini`}
          </span>
          <Link to="/display" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/25">
            <Monitor size={16} /> Layar publik
          </Link>
        </div>
      </aside>

      {/* Formulir */}
      <main className="relative flex min-h-screen items-center justify-center px-5 py-12 lg:min-h-0">
        <div className="absolute right-4 top-4"><ThemeToggle className="bg-white" /></div>

        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-200"><Ticket size={22} /></div>
            <div><h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-900">QueueEase</h1><p className="text-xs text-slate-500">Sistem Antrean Digital Kampus</p></div>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{registering ? "Buat akun baru" : "Selamat datang"}</h2>
          <p className="mb-7 mt-2 text-sm text-slate-500">
            {isStaff ? "Masuk untuk mengelola antrean layanan." : registering ? "Gunakan NIM asli. Satu NIM hanya untuk satu akun." : "Masuk dengan NIM untuk mengambil nomor antrean."}
          </p>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {[["mahasiswa", "Mahasiswa", GraduationCap], ["petugas", "Petugas", ShieldCheck]].map(([key, text, Icon]) => (
              <button key={key} type="button" onClick={() => switchRole(key)} aria-pressed={role === key}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${role === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                <Icon size={16} /> {text}
              </button>
            ))}
          </div>

          {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className={label}>{isStaff ? "Username" : "NIM"}</label>
              <div className="relative">
                <User size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="identifier" required autoFocus value={form.identifier} onChange={set("identifier")} autoComplete="username"
                  maxLength={isStaff ? 30 : 20} placeholder={isStaff ? "Masukkan username" : "Contoh: 202412003"} className={field} />
              </div>
            </div>

            {registering && (
              <div>
                <label htmlFor="nama" className={label}>Nama lengkap</label>
                <div className="relative">
                  <User size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="nama" required minLength={3} maxLength={100} value={form.nama} onChange={set("nama")} placeholder="Sesuai KTM" className={field} />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className={label}>Password</label>
              <div className="relative">
                <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="password" required type={showPass ? "text" : "password"} minLength={registering ? 6 : 1} maxLength={72} value={form.password} onChange={set("password")}
                  onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") || false)} onBlur={() => setCaps(false)}
                  autoComplete={registering ? "new-password" : "current-password"} placeholder={registering ? "Minimal 6 karakter" : "Masukkan password"} className={`${field} pr-12`} />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {caps && <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700"><AlertCircle size={13} /> Caps Lock sedang aktif</p>}
              {registering && form.password && (
                <div className="mt-2.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${score >= n ? (score === 1 ? "bg-rose-400" : score === 2 ? "bg-amber-400" : "bg-emerald-500") : "bg-slate-200"}`} />)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Kekuatan password: {["Terlalu pendek", "Lemah", "Cukup", "Kuat"][score]}</p>
                </div>
              )}
            </div>

            {registering && (
              <div>
                <label htmlFor="confirm" className={label}>Konfirmasi password</label>
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="confirm" required type={showPass ? "text" : "password"} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" placeholder="Ulangi password" className={`${field} ${form.confirm ? "pr-11" : ""}`} />
                  {form.confirm && form.confirm === form.password && <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />}
                </div>
              </div>
            )}

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : registering ? <UserPlus size={18} /> : <LogIn size={18} />}
              {loading ? "Memproses..." : registering ? "Daftar & Masuk" : "Masuk"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isStaff ? "Akun petugas dibuat oleh admin sistem." : registering ? (
              <>Sudah punya akun? <button type="button" onClick={() => switchMode("login")} className="font-semibold text-blue-600 hover:underline">Masuk</button></>
            ) : (
              <>Belum punya akun? <button type="button" onClick={() => switchMode("register")} className="font-semibold text-blue-600 hover:underline">Daftar sekarang</button></>
            )}
          </p>

          <Link to="/display" className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700 lg:hidden">
            <Monitor size={16} /> Lihat layar antrean publik
          </Link>
        </div>
      </main>
    </div>
  );
}
