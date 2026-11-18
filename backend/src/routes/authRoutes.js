import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import pool from "../config/db.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/helpers.js";

const router = Router();

const limiter = (max, windowMin, message) =>
  rateLimit({ windowMs: windowMin * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { message } });

const publicUser = (u) => ({ id: u.id, role: u.role, nim: u.nim, username: u.username, nama: u.nama });

// POST /api/auth/register – pendaftaran akun mahasiswa (NIM = identitas unik)
router.post(
  "/register",
  limiter(10, 60, "Terlalu banyak percobaan pendaftaran. Coba lagi nanti."),
  asyncHandler(async (req, res) => {
    const nim = String(req.body.nim || "").trim().toUpperCase();
    const nama = String(req.body.nama || "").trim().replace(/\s+/g, " ");
    const password = String(req.body.password || "");

    if (!/^[A-Z0-9]{5,20}$/.test(nim)) throw new HttpError(400, "NIM harus 5–20 karakter huruf/angka.");
    if (nama.length < 3 || nama.length > 100) throw new HttpError(400, "Nama harus 3–100 karakter.");
    if (password.length < 6 || password.length > 72) throw new HttpError(400, "Password harus 6–72 karakter.");

    const hash = await bcrypt.hash(password, 10);
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (role, nim, nama, password_hash) VALUES ('mahasiswa', $1, $2, $3)
         RETURNING id, role, nim, username, nama`,
        [nim, nama, hash]
      );
      res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
    } catch (error) {
      if (error.code === "23505") throw new HttpError(409, "NIM sudah terdaftar. Silakan login.");
      throw error;
    }
  })
);

// POST /api/auth/login – { role, identifier (NIM / username), password }
router.post(
  "/login",
  limiter(20, 15, "Terlalu banyak percobaan login. Coba lagi dalam 15 menit."),
  asyncHandler(async (req, res) => {
    const role = req.body.role === "petugas" ? "petugas" : "mahasiswa";
    const identifier = String(req.body.identifier || "").trim();
    const password = String(req.body.password || "");
    if (!identifier || !password) throw new HttpError(400, "Data login wajib diisi.");

    const column = role === "petugas" ? "username" : "nim";
    const value = role === "petugas" ? identifier.toLowerCase() : identifier.toUpperCase();
    const { rows } = await pool.query(
      `SELECT id, role, nim, username, nama, password_hash FROM users WHERE role = $1 AND ${column} = $2`,
      [role, value]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw new HttpError(401, `${role === "petugas" ? "Username" : "NIM"} atau password salah.`);

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// GET /api/auth/me – validasi sesi
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, role, nim, username, nama FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows[0]) throw new HttpError(401, "Akun tidak ditemukan.");
    res.json(publicUser(rows[0]));
  })
);

export default router;
