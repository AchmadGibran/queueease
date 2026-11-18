# QueueEase – Smart Queue v2 (Supabase Edition)

React + Vite + Tailwind CSS, Express.js, dan PostgreSQL (Supabase).

## Fitur
- **Login berbasis role**: `mahasiswa` (daftar & login dengan **NIM**, unik) dan `petugas` (username). Halaman dilindungi di frontend (route guard) **dan** backend (JWT + cek role).
- **Antrean per layanan** dengan kode sendiri: `K-001` Konsultasi, `S-001` Surat Aktif, `L-001` Legalisir, `C-001` Cuti, `U-001` Lainnya. Nomor berurut per layanan per hari.
- **Aturan pembatasan** (diterapkan di backend):
  - 1 mahasiswa = maks **1 nomor per layanan per hari** (berlaku untuk semua layanan, termasuk "Lainnya"; bisa diubah lewat kolom `layanan.maks_per_mahasiswa`). Nomor yang dibatalkan tidak dihitung, nomor yang dilewati (tidak hadir) tetap dihitung agar tidak disalahgunakan.
  - Maks **2 antrean aktif sekaligus** (tidak bisa berada di banyak loket bersamaan).
  - Kuota harian per layanan (`batas_harian`) dan tombol **buka/tutup layanan** oleh petugas.
- **Mengapa antrean dipisah per layanan?** Di dunia nyata tiap layanan punya petugas/loket dan lama proses berbeda (surat 5 menit vs. cuti 15 menit). Antrean terpisah mencegah layanan cepat tertahan layanan lama, dan estimasi tunggu jadi akurat.
- **Dashboard mahasiswa**: kartu biru berisi nomor Anda + posisi + estimasi, serta papan "Sedang dilayani" tiap layanan; pilih layanan bergambar; batalkan antrean; riwayat; **notifikasi bunyi + browser saat dipanggil**.
- **Dashboard petugas**: statistik, loket per layanan (Panggil Berikutnya, buka/tutup), panggil tiket tertentu, panggil ulang, selesai, lewati, pencarian (nama/NIM/nomor), filter, ekspor **CSV**, rata-rata durasi layanan.
- **Layar publik** `/display` untuk TV/monitor (tanpa login, tanpa data pribadi).
- Keamanan: password di-hash (bcrypt), rate limiting login/daftar, RLS aktif di tabel Supabase, validasi input, transaksi database anti nomor ganda.

### Tentang "update 5 detik"
Halaman tidak bisa "didorong" server secara otomatis, jadi browser **menanyakan data terbaru ke server tiap 5 detik** (polling). Jadi Anda tak perlu menekan refresh. Pada tab yang tidak terlihat, polling dijeda untuk menghemat server. Indikator "Live" di pojok halaman bisa diklik untuk memuat ulang seketika.

## Memperbarui project lama (timpa folder)
Cukup extract ZIP ini ke folder project Anda dan pilih **Replace/Timpa**. File `.env` dan `node_modules` Anda tidak ikut tertimpa. Lalu:
1. **Database**: buka Supabase > SQL Editor, jalankan seluruh isi `database/schema.sql` (aman diulang; tabel `antrean` lama otomatis disimpan sebagai `antrean_lama`).
2. **`backend/.env`**: tambahkan baris dari `backend/.env.example` — terutama **`JWT_SECRET`** (wajib, minimal 16 karakter acak), `CORS_ORIGIN`, `APP_TIMEZONE`, `ADMIN_*`.
3. `cd backend` → `npm install` (ada paket baru: bcryptjs, jsonwebtoken, express-rate-limit) → `npm run seed:petugas` (membuat akun petugas; default `petugas` / `petugas123` — **ganti** lewat `ADMIN_PASSWORD`) → `npm run dev`.
4. `cd frontend` → `npm install` → `npm run dev`.

## A. Persiapan
1. Install Node.js LTS: https://nodejs.org/
2. Siapkan akun Supabase: https://supabase.com/
3. Siapkan Visual Studio Code: https://code.visualstudio.com/

**Tidak perlu menginstal PostgreSQL lokal atau pgAdmin.** Database PostgreSQL disediakan oleh Supabase.

## B. Buat project Supabase
1. Login ke https://supabase.com/dashboard
2. Klik **New project**.
3. Pilih organisasi, isi nama project `queueease`, buat database password, dan pilih region yang sesuai (misalnya Singapore jika tersedia).
4. Klik **Create new project** dan tunggu sampai project siap.
5. Buka **SQL Editor** di menu sebelah kiri.
6. Klik **New query**.
7. Buka file `database/schema.sql` dari folder project, salin seluruh isinya ke SQL Editor.
8. Klik **Run**.
9. Buka **Table Editor** dan pastikan tabel `public.antrean` sudah muncul.

Simpan database password dengan aman. Jangan mengunggah password atau connection string ke GitHub.

## C. Ambil connection string Supabase
1. Di dashboard project Supabase, klik **Connect** (atau buka pengaturan Database/Connection string jika tampilan dashboard berbeda).
2. Pilih tab **Connection string**.
3. Pilih mode **Session pooler** dan format **URI**. Session pooler cocok untuk koneksi aplikasi Node.js yang berjalan terus-menerus dari laptop; bila opsi ini tidak tersedia, ikuti opsi koneksi yang direkomendasikan dashboard Supabase.
4. Salin URI yang ditampilkan. Jangan gunakan contoh URI di bawah sebagai alamat sungguhan.

Bentuk URI biasanya seperti:
`postgresql://postgres.PROJECT_REF:PASSWORD@HOST:5432/postgres`

Jika password mengandung karakter khusus seperti `@`, `#`, `/`, atau `:`, gunakan URL-encoding pada password. Jangan mengubah host, username, port, atau nama database yang diberikan Supabase.

## D. Konfigurasi backend
1. Extract ZIP.
2. Buka folder `queueease-supabase` di VS Code.
3. Buka terminal: **Terminal > New Terminal**.
4. Masuk ke backend:
   - Jika terminal berada di folder utama: `cd backend`
5. Install package:
   `npm install`
6. Salin `.env.example` menjadi `.env`.
   Windows CMD: `copy .env.example .env`
   PowerShell: `Copy-Item .env.example .env`
7. Buka `backend/.env`, lalu ganti `DATABASE_URL` dengan URI asli dari Supabase:

`PORT=5000`
`DATABASE_URL=postgresql://...URI_ASLI_DARI_SUPABASE...`

Jangan beri tanda kutip. Jangan membagikan file `.env` atau memasukkannya ke repository publik.

8. Jalankan backend:
   `npm run dev`

Backend seharusnya menampilkan:
`QueueEase API berjalan di http://localhost:5000`

9. Tes koneksi melalui browser:
   `http://localhost:5000/api/health`

Jika sukses, akan muncul JSON dengan status `ok` dan pesan bahwa API dan PostgreSQL terhubung.

## E. Jalankan frontend
1. Buka terminal baru di VS Code (**Terminal > New Terminal**). Biarkan terminal backend tetap berjalan.
2. Masuk ke folder frontend:
   `cd frontend`
   (Jika terminal baru dimulai dari folder utama, perintah ini langsung benar.)
3. Install package:
   `npm install`
4. Jalankan:
   `npm run dev`
5. Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

## F. Halaman aplikasi
- Login: http://localhost:5173/login (mahasiswa & petugas, sesuai role diarahkan otomatis)
- Mahasiswa: /mahasiswa · Petugas: /petugas · Layar publik: /display

## G. Uji alur antrean
1. Buka `/login`, tab **Mahasiswa** > **Daftar** dengan NIM, nama, password.
2. Pilih layanan, klik **Ambil Nomor** (mis. `K-001`). Coba ambil layanan yang sama lagi → ditolak.
3. Di jendela lain/incognito, login **Petugas** (`petugas` / password dari seed).
4. Klik **Panggil Berikutnya** pada kartu layanan → mahasiswa mendapat notifikasi & bunyi.
5. Klik **Selesai** (atau **Lewati** bila tidak hadir). Data diperbarui otomatis tiap 5 detik.

## H. Menjalankan kembali pada hari berikutnya
Tidak perlu install ulang. Jalankan dua terminal:

Terminal 1:
`cd backend`
`npm run dev`

Terminal 2:
`cd frontend`
`npm run dev`

## Troubleshooting
- `DATABASE_URL belum diatur`: pastikan file bernama `.env` (bukan `.env.example`) ada di folder `backend`.
- `password authentication failed`: cek password dan URI Supabase.
- `ENOTFOUND` atau timeout: cek koneksi internet, host, port, dan mode pooler dari URI.
- `self-signed certificate` atau masalah SSL: gunakan konfigurasi `ssl` yang sudah tersedia di `backend/src/config/db.js`; jangan menambahkan opsi SSL lain tanpa memeriksa konfigurasi.
- `EADDRINUSE 5000`: port 5000 sedang dipakai aplikasi lain.
- `Network Error`: pastikan backend berjalan dan alamat API frontend tetap `http://localhost:5000/api`.

## Catatan keamanan dan pembelajaran
- Frontend tidak menyimpan password database.
- Express menjadi perantara antara React dan PostgreSQL.
- Connection string database hanya berada di `backend/.env`; jangan commit file ini ke GitHub.
- Autentikasi, validasi, dan rate limiting sudah ada; untuk produksi tambahkan HTTPS dan atur `CORS_ORIGIN` ke domain asli.
- Refresh otomatis 5 detik menggunakan polling, bukan WebSocket.
- Ganti password petugas default sebelum dipublikasikan, dan gunakan `JWT_SECRET` yang acak.
