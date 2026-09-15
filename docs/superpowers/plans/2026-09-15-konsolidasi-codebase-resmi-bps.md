# Implementation Plan Konsolidasi Codebase Resmi CATUR BPS

**Spec:** `docs/superpowers/specs/2026-09-15-konsolidasi-codebase-resmi-bps.md`
**Branch:** `feature/multi-destination-location`

## Batch 1 — Baseline dan Struktur Repository

- [x] Rekam status Git, ukuran folder, dan file runtime yang dilindungi.
- [x] Buat struktur `frontend/` dari source FE resmi `vOLD`.
- [x] Jadikan `v2` sebagai baseline runtime `backend/` tanpa membawa secret/uploads.
- [x] Pertahankan histori fitur branch melalui selective port, bukan overwrite membabi buta.
- [x] Normalisasi `.gitignore` untuk struktur baru.
- [x] Perbarui dokumentasi path dan `CHANGELOG.md`.
- [x] Jalankan install/build smoke test dasar.
- [x] Commit dan push checkpoint Batch 1.

## Batch 2 — Migrasi Backend dan Database

- [x] Tulis/pertahankan test untuk tanggal bisnis WITA.
- [x] Port domain validasi jadwal tujuan.
- [x] Port model dan service `surat_tugas_tujuan`.
- [x] Port active assignment resolver.
- [x] Port report context dan report window.
- [x] Integrasikan controller, route, middleware, dan model ke baseline `v2`.
- [x] Pertahankan static hosting, uploads, serta port berbasis environment.
- [x] Pindahkan migration multi-tujuan, backfill, dan integritas laporan.
- [x] Verifikasi kompatibilitas migration terhadap dump PostgreSQL lama.
- [x] Perbarui `CHANGELOG.md`.
- [x] Jalankan test/lint backend.
- [x] Commit dan push checkpoint Batch 2.

## Batch 3 — Migrasi Frontend

- [x] Tulis/pertahankan test service, utility, dan komponen fitur baru.
- [x] Port konfigurasi API URL lokal/production.
- [x] Port editor jadwal multi-tujuan admin.
- [x] Port resolver timeline tujuan/presensi.
- [x] Port halaman laporan berbasis route `suratId`.
- [x] Port report deadline dan lock state.
- [x] Port perbaikan Dashboard dan Presensi Pegawai.
- [x] Pastikan asset/script legacy tidak menyebabkan error bootstrap.
- [x] Perbarui `CHANGELOG.md`.
- [x] Jalankan test, lint terarah, dan build frontend.
- [x] Commit dan push checkpoint Batch 3.

## Batch 4 — Paket Deploy Aman

- [x] Bangun frontend production.
- [x] Sinkronkan hasil build ke `backend/public` secara deterministik.
- [x] Buat manifest file deploy dan file yang harus dipertahankan di hosting.
- [x] Verifikasi `.env`, credentials, token, uploads, dan dump tidak terlacak Git.
- [x] Tambahkan preflight PostgreSQL/version/schema.
- [x] Dokumentasikan backup, migration, smoke test, dan rollback.
- [x] Perbarui `CHANGELOG.md`.
- [x] Jalankan regression suite final.
- [x] Commit dan push checkpoint Batch 4.

## Batch 5 — Konsolidasi dan Pembersihan Disk

- [x] Pastikan seluruh source penting dari `v2` dan `vOLD` sudah terwakili.
- [x] Pastikan repository dan remote berisi commit recovery final.
- [x] Hentikan runtime comparison lama.
- [x] Hapus `v2`, `vOLD`, source duplikat, build lama, dan dependency cache yang dapat dibuat ulang.
- [x] Jangan hapus dump, uploads, `.env`, credentials, atau backup tanpa target arsip yang jelas.
- [x] Jalankan install bersih, test, build, dan smoke test setelah pembersihan.
- [x] Catat ruang disk yang diperoleh dalam `CHANGELOG.md`.
- [x] Commit dan push checkpoint Batch 5.

## Definition of Done

- [x] Struktur final hanya memiliki satu FE dan satu BE aktif.
- [x] Seluruh perubahan fitur kemarin tersedia pada baseline resmi.
- [x] Tidak ada bentrok route/static frontend pada backend deploy.
- [x] Migration lulus pada salinan database legacy.
- [x] Test FE dan BE serta build production lulus.
- [x] Secret dan runtime data tidak masuk Git.
- [x] Deploy/rollback guide lengkap.
- [x] Folder recovery besar telah dibersihkan secara aman.
