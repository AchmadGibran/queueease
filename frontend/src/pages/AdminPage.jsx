import { useCallback, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, Download, ListOrdered, Lock, Megaphone, Search, Timer, Unlock, Users } from "lucide-react";
import { callNext, callTicket, completeQueue, errorMessage, getLayanan, getQueue, getStats, recallTicket, setLayananAktif, setMode, skipQueue } from "../services/api";
import usePolling from "../hooks/usePolling";
import LiveIndicator from "../components/LiveIndicator";
import Notice from "../components/Notice";
import QueueTable from "../components/QueueTable";
import Skeleton from "../components/Skeleton";
import { useCachedState } from "../utils/cache";
import StatCard from "../components/StatCard";
import { LayananIcon, layananStyle, queueMode } from "../utils/layanan";

const STATUS_FILTERS = [["aktif", "Aktif"], ["all", "Semua"], ["done", "Selesai"], ["closed", "Dilewati/Batal"]];
const ORDER = { called: 0, waiting: 1, done: 2, skipped: 3, cancelled: 4 };

export default function AdminPage() {
  const [layanan, setLayanan] = useCachedState("layanan", []);
  const [rows, setRows] = useCachedState("admin:rows", []);
  const [stats, setStats] = useCachedState("admin:stats", { total: 0, waiting: 0, called: 0, done: 0, avg_service_min: 0 });
  const [loaded, setLoaded] = useState(false);
  const [layananFilter, setLayananFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("aktif");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [l, q, s] = await Promise.all([getLayanan(), getQueue(), getStats()]);
      setLayanan(l); setRows(q); setStats(s); setUpdatedAt(new Date()); setLoaded(true);
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err, "Gagal memuat data.") });
    }
  }, [setLayanan, setRows, setStats]);
  usePolling(refresh, 5000);

  const run = async (fn, okText) => {
    setBusy(true); setNotice(null);
    try { const res = await fn(); setNotice({ type: "success", text: okText(res) }); await refresh(); }
    catch (err) { setNotice({ type: "error", text: errorMessage(err, "Aksi gagal.") }); await refresh(); }
    finally { setBusy(false); }
  };

  const onAction = (action, row) => {
    const map = {
      call: [() => callTicket(row.id), (t) => `Nomor ${t.ticket} dipanggil.`],
      recall: [() => recallTicket(row.id), (t) => `Nomor ${t.ticket} dipanggil ulang.`],
      done: [() => completeQueue(row.id), (t) => `Nomor ${t.ticket} selesai dilayani.`],
      skip: [() => skipQueue(row.id), (t) => `Nomor ${t.ticket} dilewati.`],
    };
    run(...map[action]);
  };

  const mode = queueMode(layanan);
  const nextGlobal = rows.find((r) => r.status === "waiting"); // rows sudah terurut menurut urutan umum
  const servingOf = useMemo(() => Object.fromEntries(rows.filter((r) => r.status === "called").map((r) => [r.layanan_id, r])), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => layananFilter === "all" || r.layanan_id === Number(layananFilter))
      .filter((r) => statusFilter === "all" || (statusFilter === "aktif" ? r.status === "waiting" || r.status === "called"
        : statusFilter === "done" ? r.status === "done" : r.status === "skipped" || r.status === "cancelled"))
      .filter((r) => !q || [r.nama, r.nim, r.ticket].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.urutan - b.urutan);
  }, [rows, layananFilter, statusFilter, search]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Nomor", "Nama", "NIM", "Layanan", "Catatan", "Status", "Diambil", "Dipanggil", "Selesai"];
    const body = rows.map((r) => [r.ticket, r.nama, r.nim, r.layanan_nama, r.catatan, r.status, r.created_at, r.called_at, r.finished_at].map(esc).join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `antrean-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-600">PANEL PETUGAS</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Antrean</h2>
          <p className="mt-2 text-sm text-slate-500">Kelola antrean tiap layanan hari ini.</p>
          <div className="mt-3"><LiveIndicator updatedAt={updatedAt} onRefresh={refresh} /></div>
        </div>
      </div>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Antrean" value={stats.total} icon={Users} tone="blue" />
        <StatCard label="Menunggu" value={stats.waiting} icon={Clock3} tone="amber" />
        <StatCard label="Sedang Dipanggil" value={stats.called} icon={Megaphone} tone="blue" />
        <StatCard label="Selesai" value={stats.done} icon={CheckCircle2} tone="green" />
        <StatCard label="Rata-rata Layanan" value={`${stats.avg_service_min ?? 0} mnt`} icon={Timer} tone="slate" />
      </div>

      {/* Mode antrean seluruh sistem */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-slate-500">MODE ANTREAN</p>
          <p className="mt-1 text-sm text-slate-600">
            {mode === "global" ? "Satu petugas: dipanggil menurut urutan umum (siapa datang dulu, dilayani dulu)." : "Banyak loket: tiap layanan dipanggil oleh loketnya sendiri; posisi dihitung per layanan."}
          </p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {[["global", "Satu petugas"], ["loket", "Banyak loket"]].map(([k, t]) => (
            <button key={k} disabled={busy} onClick={() => mode !== k && run(() => setMode(k), () => `Mode diubah ke ${t}.`)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === k ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{t}</button>
          ))}
        </div>
      </section>

      {/* Mode satu petugas: panggil menurut urutan umum semua layanan */}
      {mode === "global" && (
      <section className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-blue-600"><ListOrdered size={14} /> URUTAN UMUM (MODE SATU PETUGAS)</p>
          <p className="mt-1 text-sm text-slate-600">
            {nextGlobal ? <>Berikutnya: <b className="text-slate-900">{nextGlobal.ticket}</b> · urutan #{nextGlobal.urutan} · {nextGlobal.nama} ({nextGlobal.layanan_nama})</> : "Tidak ada antrean yang menunggu."}
          </p>
        </div>
        <button onClick={() => run(() => callNext(), (t) => `Urutan #${t.urutan}: ${t.ticket} (${t.nama}) dipanggil.`)} disabled={busy || !nextGlobal}
          title="Menyelesaikan nomor yang sedang dipanggil, lalu memanggil urutan umum berikutnya"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 disabled:saturate-50">
          <Megaphone size={18} /> Panggil Berikutnya
        </button>
      </section>
      )}

      {/* Satu kartu per layanan = satu loket */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500"><Activity size={16} /> LOKET PER LAYANAN <span className="font-medium normal-case tracking-normal">{mode === "loket" ? "(mode banyak loket)" : "(mode satu petugas: tombol panggil ada di atas)"}</span></h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!loaded && layanan.length === 0 && [0, 1, 2].map((i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
          {layanan.map((l) => {
            const cur = servingOf[l.id];
            const selected = String(l.id) === layananFilter;
            return (
              <div key={l.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition ${selected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"} ${l.aktif ? "" : "opacity-80"}`}>
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setLayananFilter(selected ? "all" : String(l.id))} title="Klik untuk memfilter tabel" className="flex items-center gap-3 text-left">
                    <LayananIcon ikon={l.ikon} />
                    <div><p className="font-bold text-slate-900">{l.nama}</p><p className="text-xs text-slate-500">{l.waiting} menunggu · {l.done} selesai</p></div>
                  </button>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold text-white ${layananStyle(l.ikon).solid}`}>{l.kode}</span>
                </div>
                <div className="my-4 flex min-h-[7.5rem] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-indigo-700 px-4 py-4 text-center text-white">
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-blue-100">SEDANG DILAYANI</p>
                  {cur ? (
                    <>
                      <p className="mt-1 text-4xl font-black tracking-widest">{cur.ticket}</p>
                      <p className="mt-1 max-w-full truncate text-sm text-blue-100">{cur.nama}</p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-blue-100/80">Belum ada yang dipanggil</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {mode === "loket" && <button onClick={() => run(() => callNext(l.id), (t) => `Nomor ${t.ticket} (${t.nama}) dipanggil.`)} disabled={busy || l.waiting === 0}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 disabled:saturate-50">
                    <Megaphone size={16} /> Panggil {l.kode}
                  </button>}
                  <button onClick={() => run(() => setLayananAktif(l.id, !l.aktif), (r) => `Layanan ${r.nama} ${r.aktif ? "dibuka" : "ditutup"}.`)} disabled={busy}
                    title={l.aktif ? "Tutup pengambilan antrean baru" : "Buka pengambilan antrean"}
                    className={`rounded-xl border px-3 py-2.5 transition disabled:opacity-50 ${l.aktif ? "border-slate-200 text-slate-500 hover:bg-slate-50" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"}`}>
                    {l.aktif ? <Unlock size={17} /> : <Lock size={17} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-slate-100 p-2 text-slate-600"><ListOrdered size={18} /></span>
            <div><h3 className="font-bold text-slate-900">Manajemen Antrean</h3><p className="text-xs text-slate-500">{visible.length} dari {rows.length} antrean hari ini</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / NIM / nomor" aria-label="Cari antrean"
                className="w-56 rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </div>
            <select value={layananFilter} onChange={(e) => setLayananFilter(e.target.value)} aria-label="Filter layanan"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="all">Semua layanan</option>
              {layanan.map((l) => <option key={l.id} value={l.id}>{l.kode} · {l.nama}</option>)}
            </select>
            <div className="flex rounded-xl bg-slate-100 p-1">
              {STATUS_FILTERS.map(([k, label]) => (
                <button key={k} onClick={() => setStatusFilter(k)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === k ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{label}</button>
              ))}
            </div>
            <button onClick={exportCsv} disabled={!rows.length} title="Unduh seluruh antrean hari ini (CSV)"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              <Download size={15} /> CSV
            </button>
          </div>
        </div>
        {loaded || rows.length ? (
          <QueueTable rows={visible} onAction={onAction} busy={busy} showUrutan={mode === "global"} />
        ) : (
          <div className="space-y-2 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        )}
      </section>
    </div>
  );
}
