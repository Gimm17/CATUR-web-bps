# Spesifikasi Konsolidasi Codebase Resmi CATUR BPS

**Tanggal:** 15 September 2026  
**Status:** Disetujui untuk implementasi

## Tujuan

Menghasilkan satu codebase CATUR Web yang dapat dikembangkan dan dideploy tanpa menimpa konfigurasi maupun data runtime hosting. Source frontend resmi berasal dari `vOLD/Front-end Presensi`, runtime backend resmi berasal dari `v2`, dan fitur/perbaikan pada branch `feature/multi-destination-location` dipindahkan secara selektif.

## Keputusan Baseline

- Frontend: source React/Vite lengkap dari `vOLD/Front-end Presensi`.
- Backend: source dan pola runtime hosting dari `v2`.
- Perubahan baru: commit setelah baseline awal pada branch `feature/multi-destination-location`.
- Database: dump PostgreSQL lama tetap menjadi dasar data; migration baru bersifat additive dan backward-compatible.
- Bentuk repository final: `frontend/`, `backend/`, `docs/`, dan `deploy/`.

Backend `vOLD` dan `v2` memiliki 72 file source yang sama strukturnya; 70 identik dan dua berbeda. Perbedaan runtime hosting yang wajib dipertahankan adalah penyajian static frontend dari `public`, penyajian `uploads`, serta konfigurasi port hosting.

## Arsitektur Final

```text
CATUR/
├── frontend/                 # Source React/Vite resmi dan test frontend
├── backend/
│   ├── src/                  # Express API
│   ├── migrations/           # Migration eksplisit
│   ├── tests/                # Test backend
│   ├── public/               # Hasil build frontend saat deploy
│   └── uploads/              # Data runtime; tidak dilacak Git
├── docs/
├── deploy/                   # Panduan/template tanpa secret
├── CHANGELOG.md
└── README.md
```

Frontend dibangun secara terpisah, kemudian hasil `frontend/dist` disalin ke `backend/public` hanya sebagai artefak deploy. Backend tidak menyimpan source frontend duplikat.

## Fitur yang Dipertahankan dan Dimigrasikan

1. Beberapa tujuan dalam satu surat tugas.
2. Validasi urutan dan rentang tanggal tujuan.
3. Pemilihan tujuan aktif berdasarkan tanggal bisnis WITA.
4. Perbaikan pemilihan surat/lokasi terakhir berdasarkan konteks tanggal, bukan ID terbaru.
5. Form multi-tujuan di frontend admin.
6. Relasi presensi ke tujuan surat tugas.
7. Konteks laporan yang wajib menggunakan surat tugas eksplisit.
8. Isolasi laporan antar surat tugas milik pegawai yang sama.
9. Batas waktu edit laporan dan status penguncian.
10. Timeline seluruh tujuan pada halaman laporan.
11. Pemulihan dashboard dan halaman tagging pegawai.
12. Kontrak empty state surat aktif tanpa menampilkan error palsu.
13. API base URL yang dapat dikonfigurasi untuk lokal dan production.

## Perilaku Lama yang Dihentikan

- Memilih surat aktif hanya berdasarkan `id DESC`.
- Menulis atau mengambil laporan tanpa `surat_tugas_id` yang eksplisit.
- API production yang hardcoded pada source frontend.
- Source React duplikat di dalam backend.
- Perubahan schema bisnis secara diam-diam setiap startup.
- Melacak `.env`, credentials, token, uploads, dump database, `node_modules`, APK, AAB, RAR, dan build sementara di Git.

## Database

Migration yang dibawa:

- `20260909-create-surat-tugas-tujuan.sql`
- `20260909-backfill-surat-tugas-tujuan.sql`
- `20260914-enforce-report-integrity.sql`

Perubahan database mencakup tabel child tujuan, relasi presensi ke tujuan, backfill data surat lama, enum/status laporan bila diperlukan, dan unique index integritas laporan. Data lama tidak dihapus. Presensi yatim tetap dipertahankan dan dilaporkan untuk penanganan bisnis terpisah.

Semua migration harus diuji pada salinan dump PostgreSQL 10 sebelum production. Startup backend tidak boleh menggantikan migration sebagai mekanisme utama perubahan schema.

## Kontrak Deploy

Deploy tidak boleh menimpa:

- `.env` production;
- `credential.json`, `credentials.json`, token Google, atau secret lain;
- direktori `uploads`;
- database production;
- konfigurasi process manager milik hosting tanpa verifikasi.

Artefak deploy hanya berisi source backend yang diperlukan, dependencies manifest, migration, hasil build frontend, dan panduan deployment. Port harus berasal dari environment dengan fallback yang sesuai, bukan hanya angka lokal atau hosting tertentu.

## Pengujian

- Unit dan component test frontend.
- Unit dan integration test backend.
- Build production frontend.
- Lint terarah untuk file yang dimigrasikan.
- Restore dump lama ke schema/database uji dan jalankan migration.
- Smoke test API login, surat aktif, multi-tujuan, presensi, laporan, file, dan role.
- Verifikasi manual browser untuk admin dan pegawai.

## Strategi Pembersihan

Pembersihan dilakukan setelah seluruh gate lulus dan commit recovery tersedia. Kandidat yang dibuang: `v2`, `vOLD`, source frontend duplikat, `node_modules` salinan, build lama, dan temporary comparison environment. Dump, credentials, serta uploads tidak dihapus; dipindahkan/diarsipkan di luar Git bila masih diperlukan.

## Rollback

- Source: kembali ke commit sebelum konsolidasi.
- Database: restore backup production bila migration gagal atau merusak data.
- Runtime: pertahankan salinan `.env`, credentials, uploads, dan build production sebelumnya hingga smoke test selesai.

## Acceptance Criteria

- Hanya ada satu source frontend dan satu source backend aktif.
- Backend mempertahankan perilaku runtime hosting dan mendukung konfigurasi lokal.
- Semua fitur/perbaikan kemarin tetap tersedia.
- Test frontend, test backend, build, dan migration legacy lulus.
- Repository tidak mengandung secret atau data runtime.
- Paket deploy tidak menimpa file production yang dilindungi.
- `CHANGELOG.md` diperbarui pada setiap batch.
- Folder recovery besar baru dihapus setelah hasil final terverifikasi dan tercatat di Git.
