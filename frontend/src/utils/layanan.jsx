import { CalendarClock, FileText, HelpCircle, MessageSquare, Stamp } from "lucide-react";

// Ikon & warna per jenis layanan (kelas Tailwind ditulis lengkap agar tidak terhapus saat build)
const MAP = {
  konsultasi: { icon: MessageSquare, tone: "bg-blue-50 text-blue-700 ring-blue-200", solid: "bg-blue-600" },
  surat: { icon: FileText, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", solid: "bg-emerald-600" },
  legalisir: { icon: Stamp, tone: "bg-violet-50 text-violet-700 ring-violet-200", solid: "bg-violet-600" },
  cuti: { icon: CalendarClock, tone: "bg-amber-50 text-amber-700 ring-amber-200", solid: "bg-amber-500" },
  lainnya: { icon: HelpCircle, tone: "bg-slate-100 text-slate-700 ring-slate-200", solid: "bg-slate-600" },
};
export const layananStyle = (ikon) => MAP[ikon] || MAP.lainnya;

export function LayananIcon({ ikon, size = 20, className = "" }) {
  const { icon: Icon, tone } = layananStyle(ikon);
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl p-2.5 ring-1 ring-inset ${tone} ${className}`}>
      <Icon size={size} />
    </span>
  );
}

export const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "–";
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

// Tiket yang paling baru dipanggil di semua layanan (acuan "urutan umum sekarang")
export const nowServing = (list) =>
  list.filter((l) => l.serving).sort((a, b) => new Date(b.serving_at) - new Date(a.serving_at))[0] || null;
