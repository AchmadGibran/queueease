import { useEffect, useState } from "react";

// Jam & tanggal yang berdetak tiap detik (waktu perangkat)
export default function Clock({ className = "", timeClass = "text-4xl", dateClass = "text-sm" }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={className}>
      <p className={`font-black tabular-nums tracking-wider ${timeClass}`}>
        {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(/\./g, ":")}
      </p>
      <p className={dateClass}>{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}
