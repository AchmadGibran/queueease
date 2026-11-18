import { RefreshCw } from "lucide-react";

// Penjelasan "update 5 detik": halaman otomatis mengambil data terbaru dari server tiap 5 detik,
// jadi Anda tidak perlu menekan refresh. Tombol ini untuk memuat ulang seketika.
export default function LiveIndicator({ updatedAt, onRefresh, light = false }) {
  const text = light ? "text-blue-100" : "text-slate-500";
  return (
    <button
      onClick={onRefresh}
      title="Data diperbarui otomatis tiap 5 detik. Klik untuk memuat ulang sekarang."
      className={`group inline-flex items-center gap-2 text-xs ${text} hover:opacity-80`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      Live · diperbarui {updatedAt ? updatedAt.toLocaleTimeString("id-ID") : "–"}
      <RefreshCw size={12} className="transition group-hover:rotate-180" />
    </button>
  );
}
