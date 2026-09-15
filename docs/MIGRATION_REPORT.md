# Laporan Migrasi Codebase Resmi CATUR

## Baseline Final

- Frontend berasal dari source React lengkap `vOLD/Front-end Presensi`.
- Backend mempertahankan source API berfitur lengkap dan pola runtime hosting `v2`.
- Perubahan multi-tujuan, WITA, presensi, dan laporan dari branch pengembangan telah dipertahankan.
- Struktur final repository hanya memiliki `frontend/` dan `backend/` sebagai source aplikasi aktif.

## Perubahan Utama

- Source frontend dipindahkan dari root ke `frontend/`.
- Backend menyajikan hasil build dari `backend/public` dan membaca port dari environment.
- Fallback SPA tidak menangkap URL `/api` atau `/uploads` yang tidak ditemukan.
- Default URL API frontend menjadi `/api` same-origin.
- Startup backend hanya memverifikasi schema dan tidak menjalankan DDL otomatis.
- Build release dibuat melalui `node scripts/build-release.js`.
- Clean install diperbaiki dengan menyinkronkan `frontend/package-lock.json` terhadap dependency `@popperjs/core`.

## Fitur yang Dibawa

- Beberapa tujuan dalam satu surat tugas.
- Validasi gap/overlap jadwal tujuan.
- Tujuan aktif berdasarkan tanggal WITA.
- Perbaikan pemilihan surat/lokasi terakhir.
- Presensi terhubung ke child tujuan.
- Laporan selalu terikat `surat_tugas_id` eksplisit.
- Deadline dan penguncian laporan.
- Timeline tujuan dan pemulihan dashboard/tagging pegawai.

## File dan Perilaku yang Dihilangkan

- `backend/server_upload.js`: server alternatif tidak terpakai, merujuk route yang tidak ada, memiliki secret placeholder, dan berpotensi bentrok port/static route.
- `frontend/public/vite.svg` dan `frontend/src/assets/react.svg`: asset boilerplate tidak digunakan.
- Folder recovery `vOLD` dan `v2`: dihapus setelah coverage source, uploads, credentials, SQL, peta, dan templates diverifikasi.
- Source React duplikat, arsip RAR/7z, dependency cache, build Flutter, `.dart_tool`, build frontend lama, dan environment comparison sementara.

Source Flutter tidak dihapus. Source tersebut dipindahkan ke `C:\Users\HP\Laravel\CATUR-mobile-bps`; hanya cache/build yang dapat dibuat ulang yang dibuang.

## Yang Tidak Masuk Git atau Paket Source

- `.env`
- credentials dan token
- `uploads`
- dump database
- `node_modules`
- hasil build sementara
- file password/panduan akses yang mengandung secret

## Pencegahan Konflik Deployment

1. Backup database, `.env`, credentials/token, uploads, dan build production lama.
2. Jalankan migration secara berurutan sebelum restart Node.
3. Jalankan `node scripts/build-release.js` untuk menghasilkan `backend/public`.
4. Jangan menjalankan sinkronisasi remote dengan opsi delete global.
5. Jangan menimpa file protected yang tercantum di `docs/DEPLOYMENT.md`.
6. Set `PORT` sesuai konfigurasi application manager hosting.
7. Smoke test login, static assets, API 404, surat multi-tujuan, presensi, laporan, dan file lama.

## Hasil Verifikasi

- Frontend: 35/35 test lulus.
- Backend: 68/68 test lulus tanpa skip menggunakan database test.
- Release layout: 2/2 test lulus.
- Backend lint: 81 file lulus.
- Build frontend production lulus.
- Login admin dan pegawai lokal lulus.
- `/` dan route SPA menghasilkan 200; API yang tidak ada menghasilkan 404.

## Risiko Tersisa

- Audit npm melaporkan 21 vulnerability frontend dan 18 vulnerability backend. Tidak dilakukan `npm audit fix --force` karena dapat membawa breaking change tanpa regression design tersendiri.
- Bundle JavaScript utama masih lebih besar dari 500 kB dan membutuhkan code splitting sebagai optimasi terpisah.
- Deployment production dan smoke test di domain resmi belum dilakukan dalam migrasi lokal ini.
