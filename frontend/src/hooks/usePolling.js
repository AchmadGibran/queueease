import { useEffect, useRef } from "react";
import { API_BASE } from "../services/api";

// Memanggil fn segera, lalu menyegarkan data lewat dua jalur:
//  1) Waktu nyata: server mengirim sinyal "changed" (SSE) saat ada perubahan → fn langsung dipanggil.
//  2) Cadangan: polling tiap `ms` milidetik, jika sinyal tidak sampai (koneksi putus, dll).
// Keduanya dijeda saat tab tidak terlihat dan langsung menyegarkan saat tab kembali aktif.
export default function usePolling(fn, ms = 5000) {
  const ref = useRef(fn);
  ref.current = fn;

  useEffect(() => {
    const run = () => { if (!document.hidden) ref.current(); };
    run();
    const timer = setInterval(run, ms);
    document.addEventListener("visibilitychange", run);

    let debounce;
    let source;
    if (typeof EventSource !== "undefined") {
      source = new EventSource(`${API_BASE}/events`);
      source.addEventListener("changed", () => { clearTimeout(debounce); debounce = setTimeout(run, 100); });
    }

    return () => {
      clearInterval(timer);
      clearTimeout(debounce);
      document.removeEventListener("visibilitychange", run);
      source?.close();
    };
  }, [ms]);
}
