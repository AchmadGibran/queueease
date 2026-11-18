import { Router } from "express";
import pool from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler, HttpError, parseId, TODAY, ticketCode } from "../utils/helpers.js";

const router = Router();

// GET /api/layanan – papan antrean publik (tanpa data pribadi): nomor yang sedang dilayani & jumlah menunggu
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(`
      SELECT l.id, l.kode, l.nama, l.deskripsi, l.ikon, l.estimasi_menit, l.batas_harian, l.aktif,
             COUNT(a.id) FILTER (WHERE a.status = 'waiting')::int AS waiting,
             COUNT(a.id) FILTER (WHERE a.status = 'done')::int AS done,
             (SELECT c.queue_number FROM antrean c
               WHERE c.layanan_id = l.id AND c.service_date = ${TODAY} AND c.status = 'called'
               ORDER BY c.called_at DESC LIMIT 1) AS serving_number,
             (SELECT c.urutan FROM antrean c
               WHERE c.layanan_id = l.id AND c.service_date = ${TODAY} AND c.status = 'called'
               ORDER BY c.called_at DESC LIMIT 1) AS serving_urutan,
             (SELECT c.called_at FROM antrean c
               WHERE c.layanan_id = l.id AND c.service_date = ${TODAY} AND c.status = 'called'
               ORDER BY c.called_at DESC LIMIT 1) AS serving_at,
             COALESCE((SELECT nilai FROM pengaturan WHERE kunci = 'mode_antrean'), 'global') AS mode
      FROM layanan l
      LEFT JOIN antrean a ON a.layanan_id = l.id AND a.service_date = ${TODAY}
      GROUP BY l.id
      ORDER BY l.id`);
    res.json(
      rows.map(({ serving_number, ...r }) => ({
        ...r,
        serving: serving_number ? ticketCode(r.kode, serving_number) : null,
      }))
    );
  })
);

// PATCH /api/layanan/mode { mode: "global" | "loket" } – petugas mengganti mode antrean seluruh sistem
router.patch(
  "/mode",
  requireAuth,
  requireRole("petugas"),
  asyncHandler(async (req, res) => {
    const { mode } = req.body;
    if (!["global", "loket"].includes(mode)) throw new HttpError(400, "Mode harus 'global' atau 'loket'.");
    await pool.query(
      "INSERT INTO pengaturan (kunci, nilai) VALUES ('mode_antrean', $1) ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai",
      [mode]
    );
    res.json({ mode });
  })
);

// PATCH /api/layanan/:id/aktif – petugas membuka / menutup pengambilan antrean suatu layanan
router.patch(
  "/:id/aktif",
  requireAuth,
  requireRole("petugas"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id, "ID layanan");
    if (typeof req.body.aktif !== "boolean") throw new HttpError(400, "Nilai 'aktif' harus true/false.");
    const { rows } = await pool.query(
      "UPDATE layanan SET aktif = $2 WHERE id = $1 RETURNING id, kode, nama, aktif",
      [id, req.body.aktif]
    );
    if (!rows[0]) throw new HttpError(404, "Layanan tidak ditemukan.");
    res.json(rows[0]);
  })
);

export default router;
