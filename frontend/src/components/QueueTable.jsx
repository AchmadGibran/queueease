import { CheckCircle2, Megaphone, SkipForward, Volume2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { LayananIcon, formatTime } from "../utils/layanan";

const Btn = ({ onClick, disabled, icon: Icon, children, tone }) => (
  <button onClick={onClick} disabled={disabled}
    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tone}`}>
    <Icon size={13} /> {children}
  </button>
);

const BLUE = "border-blue-200 text-blue-700 hover:bg-blue-50";
const GREEN = "border-emerald-200 text-emerald-700 hover:bg-emerald-50";
const RED = "border-rose-200 text-rose-700 hover:bg-rose-50";

// Tabel antrean untuk petugas. onAction(action, row) dengan action: call | recall | done | skip
export default function QueueTable({ rows, onAction, busy = false, showUrutan = true }) {
  if (!rows.length) return <div className="p-10 text-center text-sm text-slate-500">Tidak ada antrean yang cocok.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3.5">Nomor</th>
            <th className="px-5 py-3.5">Mahasiswa</th>
            <th className="px-5 py-3.5">Layanan</th>
            <th className="px-5 py-3.5">Jam</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className={r.status === "called" ? "bg-blue-50/50" : "hover:bg-slate-50/70"}>
              <td className="px-5 py-3.5 text-base font-extrabold tracking-wide text-blue-700">{r.ticket}{showUrutan && <span className="block text-[11px] font-semibold tracking-normal text-slate-400">Urutan #{r.urutan}</span>}</td>
              <td className="px-5 py-3.5">
                <p className="font-semibold text-slate-800">{r.nama}</p>
                <p className="text-xs text-slate-500">{r.nim}{r.catatan ? ` · ${r.catatan}` : ""}</p>
              </td>
              <td className="px-5 py-3.5">
                <span className="flex items-center gap-2 text-slate-600"><LayananIcon ikon={r.ikon} size={14} className="!p-1.5" />{r.layanan_nama}</span>
              </td>
              <td className="px-5 py-3.5 text-slate-500">{formatTime(r.created_at)}</td>
              <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
              <td className="px-5 py-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {r.status === "waiting" && <Btn tone={BLUE} icon={Megaphone} disabled={busy} onClick={() => onAction("call", r)}>Panggil</Btn>}
                  {r.status === "called" && <Btn tone={BLUE} icon={Volume2} disabled={busy} onClick={() => onAction("recall", r)}>Ulang</Btn>}
                  {r.status === "called" && <Btn tone={GREEN} icon={CheckCircle2} disabled={busy} onClick={() => onAction("done", r)}>Selesai</Btn>}
                  {(r.status === "waiting" || r.status === "called") && <Btn tone={RED} icon={SkipForward} disabled={busy} onClick={() => onAction("skip", r)}>Lewati</Btn>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
