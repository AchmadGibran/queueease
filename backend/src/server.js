import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import layananRoutes from "./routes/layananRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import { HttpError } from "./utils/helpers.js";
import { sseHandler } from "./utils/events.js";

const app = express();
const PORT = process.env.PORT || 5000;
const origins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim());

app.disable("x-powered-by");
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", message: "QueueEase API dan PostgreSQL terhubung." });
  } catch {
    res.status(500).json({ status: "error", message: "Database tidak dapat diakses." });
  }
});

app.get("/api/events", sseHandler);
app.use("/api/auth", authRoutes);
app.use("/api/layanan", layananRoutes);
app.use("/api/queue", queueRoutes);

app.use("/api", (_req, _res, next) => next(new HttpError(404, "Endpoint tidak ditemukan.")));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large")
    return res.status(400).json({ message: "Format data permintaan tidak valid." });
  console.error(err);
  res.status(500).json({ message: "Terjadi kesalahan pada server." });
});

app.listen(PORT, () => {
  console.log(`QueueEase API berjalan di http://localhost:${PORT}`);
});
