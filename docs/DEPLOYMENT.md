# Deployment CATUR Web

## Prinsip Utama

Source final terdiri dari `frontend/` dan `backend/`. Hosting menjalankan `backend/server.js`; hasil build React disajikan dari `backend/public`.

Jangan menimpa atau menghapus file production berikut:

- `backend/.env`
- `backend/credential.json`
- `backend/credentials.json`
- `backend/token.json` atau token Google lain
- `backend/uploads/`

File tersebut bukan bagian dari Git dan harus dicadangkan terpisah.

## Preflight Lokal

```powershell
cd C:\Users\HP\Laravel\CATUR\frontend
npm ci
npm test

cd ..\backend
npm ci
npm test
npm run lint

cd ..
node scripts\build-release.js
```

Perintah terakhir membangun frontend lalu menyinkronkan hanya hasil build ke `backend/public`.

## Backup Production

Sebelum upload atau `git pull`:

1. Catat commit/release production yang sedang berjalan.
2. Backup PostgreSQL dengan `pg_dump` versi server yang sesuai.
3. Arsipkan `.env`, credentials/token, `uploads`, dan build `public` sebelumnya.
4. Pastikan ruang disk cukup untuk backup dan release baru secara bersamaan.

Jangan menampilkan password atau isi secret pada log deployment.

## Urutan Migration PostgreSQL

Jalankan dari direktori aplikasi backend menggunakan koneksi production yang benar:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/20260909-create-surat-tugas-tujuan.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/20260909-backfill-surat-tugas-tujuan.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/20260914-enforce-report-integrity.sql
```

Migration harus selesai sebelum proses Node direstart. Backend sengaja menolak startup jika schema belum lengkap.

## Upload Tanpa Bentrok

Upload atau sinkronkan hanya:

- `backend/src/`
- `backend/migrations/`
- `backend/scripts/`
- `backend/tests/` bila test dijalankan di staging
- `backend/package.json` dan `backend/package-lock.json`
- `backend/server.js`
- hasil `backend/public/`

Jangan gunakan operasi sinkronisasi dengan opsi menghapus file remote secara global. Folder `uploads` production tidak boleh menjadi target cleanup.

Pastikan environment production setidaknya menyediakan konfigurasi database, JWT/secret aplikasi, Google Drive bila dipakai, dan `PORT` yang diberikan hosting. Jika `PORT` tidak tersedia, fallback aplikasi adalah `3000`.

## Smoke Test Setelah Restart

1. Buka halaman login dan pastikan asset CSS/JS tidak 404.
2. Login untuk role admin dan pegawai.
3. Pastikan endpoint API yang salah tetap 404, bukan mengembalikan HTML.
4. Buat/buka surat dengan dua tujuan dan pastikan urutannya benar.
5. Sebagai pegawai, buka surat aktif sesuai tanggal WITA.
6. Buka halaman presensi dan pastikan lokasi aktif sesuai tujuan hari itu.
7. Buka dua laporan berbeda dan pastikan data tidak tertukar.
8. Periksa upload/foto lama tetap dapat dibuka dari `uploads`.

## Rollback

1. Hentikan process release baru.
2. Pulihkan source/build dari commit atau arsip sebelumnya.
3. Pulihkan `.env`, credentials, dan uploads hanya bila file tersebut memang berubah.
4. Restore backup database hanya jika migration merusak data; rollback source saja tidak selalu memerlukan restore database.
5. Start process lama dan ulangi smoke test.
