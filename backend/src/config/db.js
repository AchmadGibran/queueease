import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// DATABASE_URL diambil dari Supabase > Connect > Session pooler > URI.
// SSL diperlukan untuk koneksi database Supabase dari komputer lokal.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur. Periksa file backend/.env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

// Menjalankan fn(client) di dalam transaksi; otomatis COMMIT / ROLLBACK dan melepas koneksi.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
