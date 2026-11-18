// Membuat / memperbarui akun petugas. Jalankan: npm run seed:petugas
import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const username = (process.env.ADMIN_USERNAME || "petugas").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "petugas123";
const nama = process.env.ADMIN_NAME || "Petugas Akademik";

if (password.length < 6) {
  console.error("ADMIN_PASSWORD minimal 6 karakter.");
  process.exit(1);
}

try {
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (role, username, nama, password_hash) VALUES ('petugas', $1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET nama = EXCLUDED.nama, password_hash = EXCLUDED.password_hash`,
    [username, nama, hash]
  );
  console.log(`Akun petugas siap. Username: ${username}`);
} catch (error) {
  console.error("Gagal membuat akun petugas:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
