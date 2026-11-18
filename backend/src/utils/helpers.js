import "dotenv/config";

// Tanggal layanan mengikuti zona waktu lokal (bukan UTC milik server database),
// sehingga antrean tidak "ganti hari" di tengah pagi WITA/WIB.
const TZ = process.env.APP_TIMEZONE || "Asia/Makassar";
if (!/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+)*$/.test(TZ)) {
  throw new Error("APP_TIMEZONE tidak valid.");
}
export const TODAY = `(NOW() AT TIME ZONE '${TZ}')::date`;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const ticketCode = (kode, number) => `${kode}-${String(number).padStart(3, "0")}`;

export function parseId(value, label = "ID") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, `${label} tidak valid.`);
  return id;
}
