// Kotak abu berdenyut sebagai pengganti konten saat data pertama kali dimuat
export default function Skeleton({ className = "", onDark = false }) {
  return <div aria-hidden className={`animate-pulse rounded-xl ${onDark ? "bg-white/15" : "bg-slate-100"} ${className}`} />;
}
