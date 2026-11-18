import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { GraduationCap, LogOut, Monitor, ShieldCheck, Ticket } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import StudentPage from "./pages/StudentPage";
import AdminPage from "./pages/AdminPage";
import DisplayPage from "./pages/DisplayPage";
import ThemeToggle from "./components/ThemeToggle";

const homeOf = (user) => (user?.role === "petugas" ? "/petugas" : "/mahasiswa");

function Splash() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Memuat…</div>;
}

// Hanya role tertentu yang boleh membuka halaman; selain itu diarahkan ke login / halaman miliknya
function RequireRole({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeOf(user)} replace />;
  return <Layout />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to={homeOf(user)} replace /> : children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return <Navigate to={user ? homeOf(user) : "/login"} replace />;
}

function Layout() {
  const { user, logout } = useAuth();
  const staff = user.role === "petugas";
  const RoleIcon = staff ? ShieldCheck : GraduationCap;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-2.5 text-white"><Ticket size={20} /></div>
            <div className="leading-tight">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">QueueEase</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Sistem Antrean Digital Kampus</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NavLink to="/display" target="_blank" title="Buka layar antrean publik"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 sm:inline-flex">
              <Monitor size={16} /> Layar Publik
            </NavLink>
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 py-1.5 pl-2 pr-3 ring-1 ring-slate-200">
              <span className="rounded-lg bg-blue-600 p-1.5 text-white"><RoleIcon size={15} /></span>
              <div className="max-w-[9rem] leading-tight">
                <p className="truncate text-sm font-semibold text-slate-800">{user.nama}</p>
                <p className="truncate text-[11px] text-slate-500">{staff ? "Petugas" : `Mahasiswa · ${user.nim}`}</p>
              </div>
            </div>
            <ThemeToggle />
            <button onClick={logout} title="Keluar" aria-label="Keluar"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        QueueEase · Praktikum Pemrograman Berbasis Framework
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/display" element={<DisplayPage />} />
        <Route element={<RequireRole role="mahasiswa" />}><Route path="/mahasiswa" element={<StudentPage />} /></Route>
        <Route element={<RequireRole role="petugas" />}><Route path="/petugas" element={<AdminPage />} /></Route>
        <Route path="/admin" element={<Navigate to="/petugas" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
