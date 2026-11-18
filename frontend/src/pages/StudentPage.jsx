import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, CheckCircle2, Clock3, History, Hourglass, Lightbulb, Lock, Megaphone, Send, Sparkles, Ticket, Timer, Users, XCircle } from "lucide-react";
import { cancelQueue, createQueue, errorMessage, getLayanan, getMyHistory, getMyQueue } from "../services/api";
import { useAuth } from "../context/AuthContext";
import usePolling from "../hooks/usePolling";
import LiveIndicator from "../components/LiveIndicator";
import Clock from "../components/Clock";
import Notice from "../components/Notice";
import Skeleton from "../components/Skeleton";
import { useCachedState } from "../utils/cache";
import StatusBadge from "../components/StatusBadge";
import { LayananIcon, formatDate, formatTime, layananStyle, nowServing, queueMode } from "../utils/layanan";
import { askNotification, canAskNotification, notify } from "../utils/notify";

const isActive = (t) => t.status === "waiting" || t.status === "called";

export default function StudentPage() {
  const { user } = useAuth();
  const [layanan, setLayanan] = useCachedState("layanan", []);
  const [mine, setMine] = useCachedState("mine", []);
  const [history, setHistory] = useCachedState("riwayat", []);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [askPerm, setAskPerm] = useState(canAskNotification());
  const seen = useRef(null); // id → "status|called_at" untuk mendeteksi giliran dipanggil

  const loadHistory = useCallback(() => getMyHistory().then(setHistory).catch(() => {}), [setHistory]);

  const refresh = useCallback(async () => {
    try {
      const [l, m] = await Promise.all([getLayanan(), getMyQueue()]);
      if (seen.current) {
        m.forEach((t) => {
          const key = `${t.status}|${t.called_at}`;
          if (t.status === "called" && seen.current[t.id] !== key) notify(`Giliran Anda: ${t.ticket}`, `Silakan menuju loket ${t.layanan_nama}.`);
        });
      }
      seen.current = Object.fromEntries(m.map((t) => [t.id, `${t.status}|${t.called_at}`]));
      setLayanan(l); setMine(m); setUpdatedAt(new Date()); setLoaded(true);
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err, "Gagal memuat data.") });
    }
  }, [setLayanan, setMine]);
  usePolling(refresh, 5000);

  // Riwayat hanya dimuat ulang saat status tiket berubah (hemat request)
  const signature = mine.map((t) => `${t.id}:${t.status}`).join(",");
  useEffect(() => { loadHistory(); }, [signature, loadHistory]);

  const loading = !loaded && layanan.length === 0;
  const activeTickets = mine.filter(isActive);
  const takenIds = useMemo(() => new Set(mine.filter((t) => t.status !== "cancelled").map((t) => t.layanan_id)), [mine]);
  const activeLayananIds = new Set(activeTickets.map((t) => t.layanan_id));
  const totalWaiting = layanan.reduce((n, l) => n + l.waiting, 0);
  const featured = activeTickets.find((t) => t.status === "called") || activeTickets[0];
  const now = nowServing(layanan);
  const global = queueMode(layanan) === "global";
  const firstName = user.nama.split(" ")[0];

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return setNotice({ type: "error", text: "Pilih layanan terlebih dahulu." });
    setBusy(true); setNotice(null);
    try {
      const t = await createQueue({ layanan_id: selected.id, catatan });
      setNotice({ type: "success", text: `Nomor antrean ${t.ticket} berhasil diambil.` });
      setSelected(null); setCatatan("");
      await refresh();
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err, "Gagal mengambil antrean.") });
    } finally { setBusy(false); }
  };

  const cancel = async (t) => {
    if (!window.confirm(`Batalkan antrean ${t.ticket}?`)) return;
    setBusy(true); setNotice(null);
    try { await cancelQueue(t.id); setNotice({ type: "success", text: `Antrean ${t.ticket} dibatalkan.` }); await refresh(); }
    catch (err) { setNotice({ type: "error", text: errorMessage(err, "Gagal membatalkan antrean.") }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-7">
      {/* Kartu biru: sapaan + papan "sedang dilayani" */}
      <section className="grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-200 sm:p-9 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-blue-100"><Sparkles size={16} /> PELAYANAN AKADEMIK</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Halo, {firstName}!</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">Ambil nomor dari mana saja, lalu datang saat giliran hampir tiba. Anda akan diberi tahu ketika dipanggil.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="mb-1 flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-blue-100"><Clock3 size={14} /> SEKARANG</p>
              <Clock timeClass="text-3xl" dateClass="text-xs text-blue-100" />
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="mb-1 flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-blue-100"><Lightbulb size={14} /> TIPS</p>
              <p className="text-sm leading-5 text-blue-50">Bawa KTM dan dokumen terkait. Datang saat ada 1–2 antrean di depan Anda.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2"><Users size={16} /> {totalWaiting} orang menunggu</span>
            {global && <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2"><Megaphone size={16} /> Urutan umum sekarang: {now ? `#${now.serving_urutan} (${now.serving})` : "belum ada"}</span>}
            <LiveIndicator light updatedAt={updatedAt} onRefresh={refresh} />
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur">
          {featured ? (
            <div className="mb-4 rounded-xl bg-white p-4 text-slate-900">
              <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-blue-600"><Ticket size={14} /> NOMOR ANDA</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-4xl font-black tracking-wider text-blue-700">{featured.ticket}</p>
                <StatusBadge status={featured.status} />
              </div>
              {global && <p className="mt-1 text-xs font-semibold text-slate-500">Urutan umum #{featured.urutan}</p>}
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                {featured.status === "called"
                  ? <><Megaphone size={15} className="text-blue-600" /> Giliran Anda — silakan menuju loket!</>
                  : <><Hourglass size={15} className="text-amber-600" /> {featured.ahead === 0 ? "Anda berikutnya!" : `${featured.ahead} antrean di depan`} · ± {featured.eta_menit} menit</>}
              </p>
            </div>
          ) : !loaded ? (
            <Skeleton onDark className="mb-4 h-24" />
          ) : (
            <p className="mb-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-blue-50">Anda belum memiliki antrean aktif. Pilih layanan di bawah.</p>
          )}
          <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-blue-100"><Megaphone size={14} /> SEDANG DILAYANI</p>
          <ul className="space-y-2">
            {loading && [0, 1, 2, 3, 4].map((i) => <li key={i}><Skeleton onDark className="h-14" /></li>)}
            {layanan.map((l) => (
              <li key={l.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${activeLayananIds.has(l.id) ? "bg-white/25 ring-1 ring-white/50" : "bg-white/10"}`}>
                <span className="flex min-w-0 items-center gap-2.5 text-sm">
                  <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-bold">{l.kode}</span>
                  <span className="truncate">{l.nama}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-black leading-tight tracking-wider">{l.serving || "—"}</span>
                  <span className="block text-[11px] text-blue-100">{l.waiting} menunggu</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {askPerm && (
        <button onClick={() => askNotification()?.then?.(() => setAskPerm(canAskNotification()))}
          className="flex w-full items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-left text-sm text-blue-800 transition hover:bg-blue-100">
          <BellRing size={18} /> <span><b>Aktifkan notifikasi</b> agar Anda diberi tahu (dengan bunyi) saat nomor Anda dipanggil.</span>
        </button>
      )}
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* Tiket aktif */}
      {activeTickets.length > 0 && (
        <section className={`grid gap-4 ${activeTickets.length > 1 ? "md:grid-cols-2" : ""}`}>
          {activeTickets.map((t) => {
            const called = t.status === "called";
            return (
              <div key={t.id} className={`rounded-2xl border p-5 shadow-sm ${called ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <LayananIcon ikon={t.ikon} />
                    <div><p className="font-bold text-slate-900">{t.layanan_nama}</p><p className="text-xs text-slate-500">Diambil {formatTime(t.created_at)}</p></div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-3 text-5xl font-black tracking-wider text-blue-700">{t.ticket}</p>
                <p className="mb-3 mt-1 text-xs font-semibold text-slate-500">{global ? `Urutan umum #${t.urutan}` : "Antrean khusus layanan ini"}</p>
                {called ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-blue-700"><Bell size={16} className="animate-pulse" /> Giliran Anda! Segera menuju loket {t.layanan_nama}.</p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><Users size={13} /> {t.ahead} di depan</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><Timer size={13} /> ± {t.eta_menit} menit</span>
                    </div>
                    <button onClick={() => cancel(t)} disabled={busy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"><XCircle size={14} /> Batalkan</button>
                  </div>
                )}
                {t.catatan && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Catatan: {t.catatan}</p>}
              </div>
            );
          })}
        </section>
      )}

      {/* Ambil nomor */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Ticket size={22} /></span>
          <div><h3 className="font-bold text-slate-900">Ambil Nomor Antrean</h3><p className="text-xs text-slate-500">Pilih layanan. Setiap layanan punya kode & antrean sendiri; maksimal 1 nomor per layanan per hari.</p></div>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {loading && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            {layanan.map((l) => {
              const taken = takenIds.has(l.id);
              const disabled = !l.aktif || taken;
              const on = selected?.id === l.id;
              return (
                <button type="button" key={l.id} disabled={disabled} onClick={() => setSelected(on ? null : l)} aria-pressed={on}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${on ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"} ${disabled ? "cursor-not-allowed opacity-55 hover:border-slate-200 hover:bg-transparent" : ""}`}>
                  <LayananIcon ikon={l.ikon} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900">{l.nama}</p>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold text-white ${layananStyle(l.ikon).solid}`}>{l.kode}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{l.deskripsi}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Users size={12} /> {l.waiting} menunggu</span>
                      <span className="inline-flex items-center gap-1"><Clock3 size={12} /> ± {l.estimasi_menit} mnt/orang</span>
                      {!l.aktif && <span className="inline-flex items-center gap-1 font-semibold text-red-600"><Lock size={12} /> Ditutup</span>}
                      {l.aktif && taken && <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 size={12} /> Sudah diambil</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div>
            <label htmlFor="catatan" className="mb-1.5 block text-sm font-semibold text-slate-700">Catatan <span className="font-normal text-slate-400">(opsional)</span></label>
            <input id="catatan" maxLength={200} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: legalisir 3 lembar ijazah"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
          <button disabled={busy || !selected} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
            <Send size={17} /> {busy ? "Memproses..." : selected ? `Ambil Nomor ${selected.kode}` : "Pilih layanan dahulu"}
          </button>
        </form>
      </section>

      {/* Riwayat */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div><h3 className="font-bold text-slate-900">Riwayat Antrean Saya</h3><p className="mt-1 text-xs text-slate-500">20 kunjungan terakhir</p></div>
          <span className="rounded-lg bg-slate-100 p-2 text-slate-600"><History size={18} /></span>
        </div>
        {history.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Belum ada riwayat.</div> : (
          <ul className="divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <LayananIcon ikon={h.ikon} size={16} className="!p-2" />
                  <div><p className="text-sm font-semibold text-slate-800">{h.ticket} · {h.layanan_nama}</p><p className="text-xs text-slate-500">{formatDate(h.created_at)} · {formatTime(h.created_at)}</p></div>
                </div>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
