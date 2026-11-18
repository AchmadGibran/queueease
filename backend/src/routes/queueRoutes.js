import { Router } from "express";
import pool, { withTransaction } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { broadcastOnWrite } from "../utils/events.js";
import { asyncHandler, getMode, HttpError, parseId, TODAY, ticketCode } from "../utils/helpers.js";

const router = Router();
router.use(requireAuth, broadcastOnWrite);

const MAKS_TIKET_AKTIF = 2; // satu mahasiswa tidak bisa berada di banyak loket sekaligus

const COLS = `a.id, a.service_date, a.queue_number, a.urutan, a.status, a.catatan, a.created_at, a.called_at, a.finished_at,
  a.nama, a.nim, l.id AS layanan_id, l.kode, l.nama AS layanan_nama, l.ikon, l.estimasi_menit`;
const FROM = `FROM antrean a JOIN layanan l ON l.id = a.layanan_id`;
const serialize = (row) => ({ ...row, ticket: ticketCode(row.kode, row.queue_number) });

const fetchOne = async (db, id) =>
  serialize((await db.query(`SELECT ${COLS} ${FROM} WHERE a.id = $1`, [id])).rows[0]);

// ─────────────── MAHASISWA ───────────────

// GET /api/queue/me – tiket saya hari ini (+ jumlah antrean di depan & estimasi)
router.get(
  "/me",
  requireRole("mahasiswa"),
  asyncHandler(async (req, res) => {
    // Posisi tunggu mengikuti mode: urutan umum (satu petugas) atau antrean per layanan (banyak loket)
    const before = (await getMode(pool)) === "loket" ? "b.layanan_id = a.layanan_id AND b.queue_number < a.queue_number" : "b.urutan < a.urutan";
    const { rows } = await pool.query(
      `SELECT ${COLS},
         (SELECT COUNT(*) FROM antrean b WHERE b.service_date = a.service_date
            AND b.status = 'waiting' AND ${before})::int AS ahead,
         (SELECT COALESCE(SUM(bl.estimasi_menit), 0) FROM antrean b JOIN layanan bl ON bl.id = b.layanan_id
          WHERE b.service_date = a.service_date AND b.status = 'waiting' AND ${before})::int AS ahead_menit
       ${FROM} WHERE a.user_id = $1 AND a.service_date = ${TODAY} ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json(rows.map((r) => ({ ...serialize(r), eta_menit: r.status === "waiting" ? r.ahead_menit + r.estimasi_menit : 0 })));
  })
);

// GET /api/queue/me/riwayat – 20 kunjungan terakhir
router.get(
  "/me/riwayat",
  requireRole("mahasiswa"),
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT ${COLS} ${FROM} WHERE a.user_id = $1 ORDER BY a.service_date DESC, a.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows.map(serialize));
  })
);

// POST /api/queue – ambil nomor { layanan_id, catatan? }
router.post(
  "/",
  requireRole("mahasiswa"),
  asyncHandler(async (req, res) => {
    const layananId = parseId(req.body.layanan_id, "Layanan");
    const catatan = String(req.body.catatan || "").trim();
    if (catatan.length > 200) throw new HttpError(400, "Catatan maksimal 200 karakter.");

    try {
      const ticket = await withTransaction(async (db) => {
        // Satu kunci per hari untuk penomoran urutan umum (semua layanan harus berurutan tanpa celah/ganda)
        await db.query("SELECT pg_advisory_xact_lock(hashtext('antrean-urutan'))");
        // Kunci baris layanan → pengambilan nomor per layanan berjalan berurutan (tanpa nomor ganda)
        const { rows: [l] } = await db.query(
          "SELECT id, nama, aktif, batas_harian, maks_per_mahasiswa FROM layanan WHERE id = $1 FOR UPDATE",
          [layananId]
        );
        if (!l) throw new HttpError(404, "Layanan tidak ditemukan.");
        if (!l.aktif) throw new HttpError(409, `Layanan ${l.nama} sedang ditutup.`);

        const { rows: [u] } = await db.query("SELECT nim, nama FROM users WHERE id = $1 AND role = 'mahasiswa'", [req.user.id]);
        if (!u) throw new HttpError(401, "Akun tidak ditemukan.");

        const { rows: [c] } = await db.query(
          `SELECT COALESCE(MAX(queue_number), 0)::int AS last,
                  COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS taken,
                  COUNT(*) FILTER (WHERE user_id = $2 AND status <> 'cancelled')::int AS mine
           FROM antrean WHERE layanan_id = $1 AND service_date = ${TODAY}`,
          [l.id, req.user.id]
        );
        if (c.mine >= l.maks_per_mahasiswa)
          throw new HttpError(409, `Anda sudah mengambil antrean ${l.nama} hari ini (maksimal ${l.maks_per_mahasiswa} per hari).`);
        if (c.taken >= l.batas_harian)
          throw new HttpError(409, `Kuota antrean ${l.nama} hari ini sudah penuh. Coba lagi besok.`);

        const { rows: [active] } = await db.query(
          `SELECT COUNT(*)::int AS n FROM antrean WHERE user_id = $1 AND service_date = ${TODAY} AND status IN ('waiting','called')`,
          [req.user.id]
        );
        if (active.n >= MAKS_TIKET_AKTIF)
          throw new HttpError(409, `Anda masih memiliki ${active.n} antrean aktif. Selesaikan atau batalkan dahulu.`);

        const { rows: [g] } = await db.query(
          `SELECT COALESCE(MAX(urutan), 0)::int AS last FROM antrean WHERE service_date = ${TODAY}`
        );
        const { rows: [created] } = await db.query(
          `INSERT INTO antrean (service_date, layanan_id, user_id, queue_number, urutan, nama, nim, catatan)
           VALUES (${TODAY}, $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [l.id, req.user.id, c.last + 1, g.last + 1, u.nama, u.nim, catatan]
        );
        return fetchOne(db, created.id);
      });
      res.status(201).json(ticket);
    } catch (error) {
      if (error.code === "23505") throw new HttpError(409, "Anda sudah memiliki antrean untuk layanan ini hari ini.");
      throw error;
    }
  })
);

// PATCH /api/queue/:id/cancel – mahasiswa membatalkan antrean miliknya yang masih menunggu
router.patch(
  "/:id/cancel",
  requireRole("mahasiswa"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "ID antrean");
    const { rowCount } = await pool.query(
      `UPDATE antrean SET status = 'cancelled', finished_at = NOW()
       WHERE id = $1 AND user_id = $2 AND service_date = ${TODAY} AND status = 'waiting'`,
      [id, req.user.id]
    );
    if (!rowCount) throw new HttpError(409, "Antrean tidak ditemukan atau sudah tidak bisa dibatalkan.");
    res.json(await fetchOne(pool, id));
  })
);

// ─────────────── PETUGAS ───────────────

// GET /api/queue?layanan_id= – seluruh antrean hari ini
router.get(
  "/",
  requireRole("petugas"),
  asyncHandler(async (req, res) => {
    const params = [];
    let filter = "";
    if (req.query.layanan_id) { params.push(parseId(req.query.layanan_id, "Layanan")); filter = "AND a.layanan_id = $1"; }
    const { rows } = await pool.query(
      `SELECT ${COLS} ${FROM} WHERE a.service_date = ${TODAY} ${filter} ORDER BY a.urutan`,
      params
    );
    res.json(rows.map(serialize));
  })
);

// GET /api/queue/stats – ringkasan hari ini
router.get(
  "/stats",
  requireRole("petugas"),
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'waiting')::int AS waiting,
        COUNT(*) FILTER (WHERE status = 'called')::int AS called,
        COUNT(*) FILTER (WHERE status = 'done')::int AS done,
        COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
        COALESCE(ROUND((AVG(EXTRACT(EPOCH FROM (finished_at - called_at)) / 60)
          FILTER (WHERE status = 'done' AND called_at IS NOT NULL AND finished_at IS NOT NULL))::numeric, 1), 0)::float AS avg_service_min
      FROM antrean WHERE service_date = ${TODAY}`);
    res.json(rows[0]);
  })
);

// Memanggil satu tiket (id) atau tiket menunggu paling awal (id = null) pada sebuah layanan.
// Tiket yang sedang dipanggil di layanan yang sama otomatis dianggap selesai.
const callTicket = (layananId, id, finishAll = false) =>
  withTransaction(async (db) => {
    const { rows: [l] } = await db.query("SELECT id FROM layanan WHERE id = $1 FOR UPDATE", [layananId]);
    if (!l) throw new HttpError(404, "Layanan tidak ditemukan.");

    const { rows: [target] } = await db.query(
      `SELECT id FROM antrean WHERE layanan_id = $1 AND service_date = ${TODAY} AND status = 'waiting'
         AND ($2::bigint IS NULL OR id = $2) ORDER BY queue_number LIMIT 1`,
      [layananId, id]
    );
    if (!target) throw new HttpError(404, id ? "Antrean tidak ditemukan atau sudah diproses." : "Tidak ada antrean yang menunggu.");

    await db.query(
      `UPDATE antrean SET status = 'done', finished_at = NOW()
       WHERE service_date = ${TODAY} AND status = 'called' AND ($2::boolean OR layanan_id = $1)`,
      [layananId, finishAll]
    );
    await db.query("UPDATE antrean SET status = 'called', called_at = NOW() WHERE id = $1", [target.id]);
    return fetchOne(db, target.id);
  });

// Mode SATU PETUGAS: panggil tiket menunggu dengan urutan umum terkecil (semua layanan, FIFO).
// Tiket yang sedang dipanggil otomatis dianggap selesai.
const callNextGlobal = () =>
  withTransaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('antrean-panggil'))");
    const { rows: [target] } = await db.query(
      `SELECT id FROM antrean WHERE service_date = ${TODAY} AND status = 'waiting' ORDER BY urutan LIMIT 1 FOR UPDATE`
    );
    if (!target) throw new HttpError(404, "Tidak ada antrean yang menunggu.");
    await db.query(`UPDATE antrean SET status = 'done', finished_at = NOW() WHERE service_date = ${TODAY} AND status = 'called'`);
    await db.query("UPDATE antrean SET status = 'called', called_at = NOW() WHERE id = $1", [target.id]);
    return fetchOne(db, target.id);
  });

// PATCH /api/queue/call-next  → tanpa layanan_id: urutan umum (satu petugas); dengan { layanan_id }: khusus satu layanan (banyak loket)
router.patch(
  "/call-next",
  requireRole("petugas"),
  asyncHandler(async (req, res) => {
    const mode = await getMode(pool);
    if (req.body.layanan_id) {
      if (mode !== "loket") throw new HttpError(409, "Mode saat ini: Satu petugas (urutan umum). Ubah ke mode Banyak loket untuk memanggil per layanan.");
      return res.json(await callTicket(parseId(req.body.layanan_id, "Layanan"), null));
    }
    if (mode !== "global") throw new HttpError(409, "Mode saat ini: Banyak loket. Panggil dari kartu layanan, atau ubah ke mode Satu petugas.");
    res.json(await callNextGlobal());
  })
);

// PATCH /api/queue/:id/call – panggil tiket tertentu (mis. mahasiswa yang diprioritaskan)
router.patch(
  "/:id/call",
  requireRole("petugas"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "ID antrean");
    const { rows: [t] } = await pool.query(`SELECT layanan_id FROM antrean WHERE id = $1 AND service_date = ${TODAY}`, [id]);
    if (!t) throw new HttpError(404, "Antrean tidak ditemukan.");
    res.json(await callTicket(t.layanan_id, id, (await getMode(pool)) === "global"));
  })
);

// PATCH /api/queue/:id/recall – panggil ulang (memicu notifikasi lagi di perangkat mahasiswa)
router.patch(
  "/:id/recall",
  requireRole("petugas"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "ID antrean");
    const { rowCount } = await pool.query(
      `UPDATE antrean SET called_at = NOW() WHERE id = $1 AND service_date = ${TODAY} AND status = 'called'`, [id]);
    if (!rowCount) throw new HttpError(409, "Hanya antrean berstatus Dipanggil yang bisa dipanggil ulang.");
    res.json(await fetchOne(pool, id));
  })
);

const finisher = (status, from, message) =>
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "ID antrean");
    const { rowCount } = await pool.query(
      `UPDATE antrean SET status = $2, finished_at = NOW()
       WHERE id = $1 AND service_date = ${TODAY} AND status = ANY($3::text[])`,
      [id, status, from]
    );
    if (!rowCount) throw new HttpError(409, message);
    res.json(await fetchOne(pool, id));
  });

// PATCH /api/queue/:id/done – layanan selesai (hanya dari status Dipanggil)
router.patch("/:id/done", requireRole("petugas"), finisher("done", ["called"], "Hanya antrean berstatus Dipanggil yang bisa diselesaikan."));
// PATCH /api/queue/:id/skip – mahasiswa tidak hadir / dilewati
router.patch("/:id/skip", requireRole("petugas"), finisher("skipped", ["waiting", "called"], "Antrean sudah diproses atau tidak ditemukan."));

export default router;
