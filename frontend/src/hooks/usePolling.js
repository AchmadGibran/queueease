import { useEffect, useRef } from "react";

// Memanggil fn segera, lalu berulang tiap `ms` milidetik (polling).
// Dijeda saat tab tidak terlihat dan langsung menyegarkan saat tab kembali aktif → hemat server.
export default function usePolling(fn, ms = 5000) {
  const ref = useRef(fn);
  ref.current = fn;

  useEffect(() => {
    const run = () => { if (!document.hidden) ref.current(); };
    run();
    const timer = setInterval(run, ms);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [ms]);
}
