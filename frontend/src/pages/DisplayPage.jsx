import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, Lock, Megaphone, Ticket, Users } from "lucide-react";
import { getLayanan } from "../services/api";
import usePolling from "../hooks/usePolling";
import Clock from "../components/Clock";
import Skeleton from "../components/Skeleton";
import { useCachedState } from "../utils/cache";
import LiveIndicator from "../components/LiveIndicator";
import { LayananIcon, nowServing, queueMode } from "../utils/layanan";

// Layar publik untuk TV/monitor di area pelayanan: tanpa login, tanpa data pribadi
export default function DisplayPage() {
  const [layanan, setLayanan] = useCachedState("layanan", []);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState(false);

  const refresh = async () => {
    try { setLayanan(await getLayanan()); setUpdatedAt(new Date()); setError(false); } catch { setError(true); }
  };
  usePolling(refresh, 5000);

  // Layar ini selalu gelap; matikan sementara kelas "dark" agar gaya mode gelap tidak ikut mengubahnya
  useEffect(() => {
    const el = document.documentElement;
    const was = el.classList.contains("dark");
    el.classList.remove("dark");
    return () => { if (was) el.classList.add("dark"); };
  }, []);

  const now = nowServing(layanan);
  const global = queueMode(layanan) === "global";

  return (
    <div className="min-h-screen bg-slate-900 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              <ArrowLeft size={16} /> Kembali
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-600 p-2.5"><Ticket size={24} /></div>
              <div><h1 className="text-xl font-extrabold">QueueEase</h1><p className="text-xs text-slate-400">Layar Antrean Pelayanan Akademik</p></div>
            </div>
          </div>
          <div className="text-right">
            <LiveIndicator light updatedAt={updatedAt} onRefresh={refresh} />
            {error && <p className="mt-1 text-xs text-red-400">Koneksi ke server terputus…</p>}
          </div>
        </div>

        {global && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-blue-400/30 bg-gradient-to-r from-blue-600/30 to-indigo-600/20 px-7 py-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-blue-300"><Megaphone size={14} /> URUTAN UMUM SEKARANG</p>
              <p className="mt-1 text-sm text-slate-300">
                {now ? <>Dipanggil: <b className="text-white">{now.serving}</b> · {now.nama}</> : "Belum ada yang dipanggil"}
              </p>
            </div>
            <p className={`text-6xl font-black tracking-wider ${now ? "text-white" : "text-slate-600"}`}>{now ? `#${now.serving_urutan}` : "—"}</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {!updatedAt && layanan.length === 0 && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} onDark className="h-56 rounded-3xl" />)}
          {layanan.map((l) => (
            <div key={l.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-3">
                <LayananIcon ikon={l.ikon} />
                <div><p className="font-bold">{l.nama}</p><p className="text-xs text-slate-400">Kode {l.kode}</p></div>
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-blue-300"><Megaphone size={14} /> SEDANG DILAYANI</p>
              <p className={`mt-1 text-7xl font-black tracking-wider ${l.serving ? "text-white" : "text-slate-600"}`}>{l.serving || "—"}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-300">
                <span className="flex items-center gap-2"><Users size={15} /> {l.waiting} menunggu</span>
                {!l.aktif && <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300"><Lock size={12} /> Ditutup</span>}
              </div>
            </div>
          ))}
          <div className="flex flex-col justify-between rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600/30 to-indigo-600/20 p-6">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-blue-300"><Clock3 size={14} /> WAKTU SEKARANG</p>
            <Clock className="my-4" timeClass="text-6xl" dateClass="mt-2 text-sm text-slate-300" />
            <div className="space-y-1.5 border-t border-white/10 pt-4 text-sm text-slate-300">
              {global && <p className="flex items-center gap-2"><Megaphone size={15} /> Urutan umum: <b className="text-white">{now ? `#${now.serving_urutan} · ${now.serving}` : "—"}</b></p>}
              <p className="flex items-center gap-2"><Users size={15} /> {layanan.reduce((n, l) => n + l.waiting, 0)} total menunggu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
