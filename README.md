# CATUR Web BPS

CATUR (Control of Activity and Time Use Record) adalah aplikasi React + Express + PostgreSQL untuk surat tugas, presensi perjalanan dinas, laporan, persetujuan, dan pencairan dana. Frontend React/Vite berada di `frontend/`, backend Express/Sequelize di `backend/`, dan zona tanggal bisnis adalah `Asia/Makassar` (WITA).

## Menjalankan aplikasi lokal

Prasyarat: Node.js, npm, PostgreSQL 17, database development, serta isi `backend/.env` berdasarkan `backend/.env.example`. Jangan commit `.env`, credential Google, dump database, token, atau folder upload.

```powershell
# Terminal backend
cd C:\Users\HP\Laravel\CATUR\backend
npm install
node server.js

# Terminal frontend
cd C:\Users\HP\Laravel\CATUR\frontend
npm install
npm run dev
```

Frontend lokal mengarah ke `http://127.0.0.1:3000/api` melalui `.env.local`. Buka URL Vite, biasanya `http://localhost:5173`.

## Migration laporan per surat

Migration menambahkan status `draft` dan unique index satu laporan per pasangan surat–pegawai:

```powershell
psql -d catur_dev -f backend\migrations\20260914-enforce-report-integrity.sql
```

Sebelum migration, backup database dan pastikan preflight menghasilkan nol baris:

```powershell
pg_dump --format=custom --file=catur-before-report-integrity.dump $env:DATABASE_URL
```

```sql
SELECT surat_tugas_id, pegawai_id, COUNT(*)
FROM laporan_perjalanan
GROUP BY surat_tugas_id, pegawai_id
HAVING COUNT(*) > 1;
```

## Route dan endpoint laporan

- `/laporan` — resolver surat aktif; tidak memilih record terbaru.
- `/laporan/:suratId` — progres dan seluruh aksi satu surat eksplisit.
- `/laporan-report` — riwayat semua surat/laporan pegawai.
- `/laporan-surat/:id` — redirect kompatibilitas ke `/laporan/:id`.
- `GET /api/perjalanan/surat/:suratId`
- `POST /api/perjalanan/surat/:suratId/kirim`
- `GET|POST /api/perjalanan/surat/:suratId/ttd-pegawai`
- `GET|POST|DELETE /api/perjalanan/surat/:suratId/bukti-pembayaran`
- `PUT /api/presensi/:presensiId/laporan`

Endpoint legacy `/api/perjalanan`, `/api/perjalanan/kirim`, endpoint TTD/nota tanpa `suratId`, dan `PUT /api/presensi/laporan` masih tersedia sementara untuk kompatibilitas client lama. Adapter presensi lama mengirim header `Deprecation: true`.

## Aturan deadline laporan

Deadline adalah tujuh hari kalender setelah tanggal selesai tujuan terakhir, dihitung dalam WITA. Laporan dapat diedit sampai 23:59:59 WITA pada tanggal deadline dan terkunci mulai 00:00:00 WITA hari berikutnya. Status proses keuangan (`dicek_keuangan`, `disetujui_keuangan`, `ditandatangani`, `pencairan_dana`, dan `dana_turun`) mengunci perubahan lebih awal.

Frontend menampilkan `report_window`, tetapi enforcement final dilakukan backend. Response lock memakai HTTP 409 dengan kode `REPORT_DEADLINE_PASSED` atau `REPORT_LOCKED_BY_STATUS`.

## Test otomatis

Gunakan database test terpisah, tidak pernah database produksi:

```powershell
$env:CATUR_TEST_DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/catur_test'
cd C:\Users\HP\Laravel\CATUR\backend
npm test
npm run lint

cd C:\Users\HP\Laravel\CATUR\frontend
npm test
npm run build
```

`npm run lint` global frontend masih memuat utang baseline konfigurasi/kode lama. Lint terarah perubahan laporan dicatat di `CHANGELOG.md`.

## QA manual lokal

### Admin

1. Login sebagai admin, buat satu pegawai uji, lalu buka menu surat tugas.
2. Buat satu surat berisi Buol tanggal 14–16 dan Tolitoli tanggal 17–19.
3. Simpan dan buka detail/edit kembali. Pastikan tetap satu surat, dua tujuan terurut, envelope 14–19, tanpa overlap atau gap.

### Pegawai

1. Buka Surat A dari dashboard; URL harus `/laporan/<id-surat-a>`.
2. Catat nomor surat, tujuan, presensi, TTD, nota, status, dan deadline.
3. Buka `/laporan-report`, pilih Surat B, lalu pastikan URL dan seluruh data berubah ke ID Surat B.
4. Kembali ke Surat A dan pastikan tidak ada data Surat B yang tertinggal.
5. Edit laporan harian, upload/ganti TTD, upload/reset nota, dan kirim laporan. Pastikan hanya Surat A berubah.
6. Surat tanpa laporan harus tetap memiliki tombol `Lanjutkan`.

### Deadline dan lock

1. Uji sebelum deadline, tepat pada deadline, dan setelah deadline.
2. Pastikan kartu menampilkan tanggal selesai, deadline, WITA, sisa hari, dan alasan lock.
3. Saat terkunci, tombol edit, TTD, nota, reset, dan kirim harus disabled dengan tooltip alasan.
4. Laporan `dikirim` yang dikembalikan dengan catatan masih dapat diperbaiki sebelum deadline.
5. Status `dicek_keuangan` harus ditolak backend dengan HTTP 409 walaupun request dikirim langsung.

## Rollout

1. Backup database dan arsipkan commit release sebelumnya.
2. Jalankan preflight duplikat, lalu migration pada staging.
3. Jalankan backend test/lint dan frontend test/build.
4. Smoke test login seluruh role, surat multi-tujuan, route berdasarkan ID, upload file, deadline, dan riwayat.
5. Setelah staging lulus, ulangi backup, migration, deploy, dan smoke test production dalam maintenance window.

Panduan deployment lengkap dan daftar file production yang tidak boleh ditimpa tersedia di [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Rollback

1. Kembalikan aplikasi ke commit release sebelumnya.
2. Jika perlu, jalankan `DROP INDEX IF EXISTS uq_laporan_perjalanan_surat_pegawai;`.
3. Biarkan nilai enum PostgreSQL `draft`; penghapusannya berisiko dan tidak diperlukan.
4. Pulihkan dump hanya jika migration atau verifikasi data gagal, bukan hanya untuk rollback kode.
