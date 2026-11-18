// Pemberitahuan waktu nyata (SSE): server memberi sinyal "changed" ke semua halaman yang terbuka
// setiap kali data antrean berubah; halaman lalu mengambil data terbaru. Sinyal tidak membawa data pribadi.
const clients = new Set();

export function sseHandler(req, res) {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  clients.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 25000); // jaga koneksi tetap hidup
  req.on("close", () => { clearInterval(ping); clients.delete(res); });
}

export function notifyChange() {
  for (const res of clients) res.write("event: changed\ndata: 1\n\n");
}

// Middleware: setelah permintaan yang mengubah data berhasil, kabari semua klien
export function broadcastOnWrite(req, res, next) {
  if (req.method !== "GET") res.on("finish", () => { if (res.statusCode < 400) notifyChange(); });
  next();
}
