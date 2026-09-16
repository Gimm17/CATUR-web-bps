# Panduan Update CATUR di Server BPS

Paket ini dibuat untuk memperbarui deployment CATUR lama tanpa mengganti data produksi. Frontend, backend, dan migration database sudah dipisahkan sesuai tujuan masing-masing.

## Isi paket

- `public/`: hasil build frontend production. Folder ini menggantikan folder `public` lama.
- `src/`: source backend terbaru. Folder ini menggantikan folder `src` lama.
- `migrations/`: tiga migration database yang wajib dijalankan berurutan.
- `database-tools/00_PRECHECK_DATABASE.sql`: pemeriksaan database sebelum migration.
- `database-tools/04_VERIFY_DATABASE.sql`: pemeriksaan hasil setelah migration.
- `CHANGELOG.md`: catatan lengkap perubahan aplikasi.
- `MANIFEST-SHA256.txt`: checksum seluruh file paket.

## File server yang wajib dipertahankan

Paket sengaja tidak membawa file berikut. Jangan menghapus atau menimpanya:

- `.env`
- `.htaccess`
- `index.js` atau startup file Passenger/cPanel yang sedang aktif
- `credential.json`
- `credentials.json`
- `token.json`
- `uploads/`
- `node_modules/`
- folder peta dan konfigurasi hosting lain

## Urutan deployment

### 1. Hentikan atau restart-later Node Application

Jika tersedia, hentikan aplikasi melalui menu **Setup Node.js App** agar tidak ada request masuk selama pergantian file.

### 2. Buat backup

Backup minimum:

- Database PostgreSQL produksi.
- Folder server `public`.
- Folder server `src`.
- Startup file `index.js`.

Contoh backup database:

```bash
pg_dump -h HOST -p PORT -U USER -Fc DATABASE > catur-before-update.backup
```

### 3. Periksa database

Jalankan dari root hasil extract paket:

```bash
psql -h HOST -p PORT -U USER -d DATABASE -v ON_ERROR_STOP=1 \
  -f database-tools/00_PRECHECK_DATABASE.sql
```

Bagian `duplicate_laporan` harus menghasilkan nol baris. Jika menghasilkan data, hentikan deployment dan periksa laporan ganda sebelum migration ketiga.

### 4. Jalankan migration berurutan

```bash
psql -h HOST -p PORT -U USER -d DATABASE -v ON_ERROR_STOP=1 \
  -f migrations/20260909-create-surat-tugas-tujuan.sql

psql -h HOST -p PORT -U USER -d DATABASE -v ON_ERROR_STOP=1 \
  -f migrations/20260909-backfill-surat-tugas-tujuan.sql

psql -h HOST -p PORT -U USER -d DATABASE -v ON_ERROR_STOP=1 \
  -f migrations/20260914-enforce-report-integrity.sql
```

Jangan import dump database penuh untuk proses update ini. Migration di atas menambah struktur yang diperlukan sambil mempertahankan akun, surat tugas, presensi, laporan, dan data lain yang sudah ada di server BPS.

### 5. Ganti frontend

1. Ubah nama folder server `public` menjadi contoh `public_backup_20260916`.
2. Pindahkan folder `public` dari paket ke root aplikasi.
3. Pastikan hasil akhirnya langsung berupa:

```text
public/index.html
public/assets/
public/img/
```

Jangan sampai menjadi `public/public` atau `public/dist`.

### 6. Ganti backend

1. Ubah nama folder server `src` menjadi contoh `src_backup_20260916`.
2. Pindahkan folder `src` dari paket ke root aplikasi.
3. Pertahankan `index.js`, `.env`, credential Google, uploads, dan `node_modules` lama.

Tidak ada dependency runtime baru pada update ini, sehingga `npm install` tidak wajib dijalankan.

### 7. Verifikasi database

```bash
psql -h HOST -p PORT -U USER -d DATABASE -v ON_ERROR_STOP=1 \
  -f database-tools/04_VERIFY_DATABASE.sql
```

Semua kolom `ok` pada hasil pemeriksaan struktur harus bernilai `true`. `duplicate_laporan` harus tetap nol baris. Presensi lama yang tidak dapat dipetakan secara aman boleh tetap mempunyai `surat_tugas_tujuan_id` kosong.

### 8. Hidupkan ulang aplikasi

Restart Node Application melalui cPanel/Passenger, lalu lakukan hard refresh browser dengan `Ctrl+F5`.

### 9. Smoke test

Uji minimal:

1. Login pegawai, admin, atasan, dan keuangan.
2. Dashboard dapat dibuka tanpa Network Error.
3. Tagging Perjadin menampilkan tugas aktif/berakhir dengan benar.
4. Laporan & Statistik membuka surat yang dipilih.
5. Daftar Laporan tampil terpisah.
6. Laporan selesai masih dapat dibuka dan hanya dapat diedit dalam batas tujuh hari serta sebelum diproses keuangan.
7. Unduhan surat tugas dan PDF laporan bekerja.
8. Upload foto, nota, tanda tangan, dan file laporan tidak kehilangan file lama.

## Rollback

Jika aplikasi gagal setelah restart:

1. Hentikan Node Application.
2. Pulihkan folder `src` dan `public` dari backup.
3. Pulihkan database dari backup `catur-before-update.backup` hanya jika migration perlu dibatalkan.
4. Restart aplikasi dan periksa log Passenger/Node.

