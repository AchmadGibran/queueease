import { CheckCircle2, Clock3, Megaphone, SkipForward, XCircle } from "lucide-react";

const STATUS = {
  waiting: { label: "Menunggu", icon: Clock3, cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  called: { label: "Dipanggil", icon: Megaphone, cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  done: { label: "Selesai", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  skipped: { label: "Dilewati", icon: SkipForward, cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  cancelled: { label: "Dibatalkan", icon: XCircle, cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, icon: Clock3, cls: "bg-slate-100 text-slate-600 ring-slate-200" };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${s.cls}`}>
      <Icon size={13} /> {s.label}
    </span>
  );
}
