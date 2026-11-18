import { AlertCircle, CheckCircle2, X } from "lucide-react";

export default function Notice({ notice, onClose }) {
  if (!notice) return null;
  const error = notice.type === "error";
  const Icon = error ? AlertCircle : CheckCircle2;
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{notice.text}</span>
      <button onClick={onClose} aria-label="Tutup" className="opacity-60 hover:opacity-100"><X size={16} /></button>
    </div>
  );
}
