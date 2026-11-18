import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "queueease_theme";

// Tombol terang/gelap. Pilihan disimpan di browser; default mengikuti pengaturan perangkat.
export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch { /* abaikan */ }
    setDark(next);
  };

  return (
    <button onClick={toggle} title={dark ? "Mode terang" : "Mode gelap"} aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className={`rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-blue-700 ${className}`}>
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
