import jwt from "jsonwebtoken";
import "dotenv/config";
import { HttpError } from "../utils/helpers.js";

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) {
  throw new Error("JWT_SECRET belum diatur (minimal 16 karakter). Periksa file backend/.env");
}

export const signToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role }, SECRET, { expiresIn: "8h" });

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, "Silakan login terlebih dahulu."));
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    next(new HttpError(401, "Sesi berakhir. Silakan login kembali."));
  }
}

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : next(new HttpError(403, "Anda tidak memiliki akses ke fitur ini."));
