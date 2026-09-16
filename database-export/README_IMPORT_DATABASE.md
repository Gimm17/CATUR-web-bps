# Database CATUR — Panduan Import

Arsip ini berisi salinan schema aplikasi `public` dari database lokal `catur_dev` per 16 September 2026 dalam format SQL biasa. Format ini dipilih agar dapat diimpor ke PostgreSQL 10. Metadata khusus PostgreSQL 17 yang tidak didukung PostgreSQL 10 sudah dikeluarkan dari file export.

## Sebelum import

1. Simpan backup database tujuan terlebih dahulu.
2. Pastikan PostgreSQL dan aplikasi tujuan dihentikan sementara bila diperlukan.
3. Import ke database baru/kosong lebih aman daripada menimpa database aktif.
4. Setelah import, isi koneksi database tujuan pada file `.env` aplikasi. Jangan menyalin `.env` lokal.

## Import melalui terminal

Gunakan PostgreSQL 10 atau versi yang lebih baru. Ganti nilai dalam tanda kurung siku:

```powershell
psql -h [HOST_DATABASE] -p [PORT] -U [USER_DATABASE] -d [NAMA_DATABASE_TUJUAN] -v ON_ERROR_STOP=1 -f catur_dev_2026-09-16.sql
```

Jika database belum ada, buat lebih dahulu dari cPanel PostgreSQL Databases atau dengan:

```powershell
createdb -h [HOST_DATABASE] -p [PORT] -U [USER_DATABASE] [NAMA_DATABASE_TUJUAN]
```

## Import melalui pgAdmin

1. Buka **pgAdmin** dan sambungkan ke server PostgreSQL tujuan.
2. Buat database kosong baru.
3. Klik kanan database tersebut → **Query Tool**.
4. Buka file `catur_dev_2026-09-16.sql`, lalu jalankan seluruh query.

## Keamanan

File SQL memuat data aplikasi termasuk akun pengguna dan hash password. Kirim hanya lewat media privat yang dapat diakses atasan, misalnya Google Drive dengan akses terbatas. Jangan unggah ke repository GitHub, grup chat, atau penyimpanan publik.

File ini tidak mencakup `.env`, credential Google, token, atau file unggahan aplikasi.
