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
- [ ] Commit dan push checkpoint Batch 1.

## Batch 2 — Migrasi Backend dan Database

- [ ] Tulis/pertahankan test untuk tanggal bisnis WITA.
- [ ] Port domain validasi jadwal tujuan.
- [ ] Port model dan service `surat_tugas_tujuan`.
- [ ] Port active assignment resolver.
- [ ] Port report context dan report window.
- [ ] Integrasikan controller, route, middleware, dan model ke baseline `v2`.
- [ ] Pertahankan static hosting, uploads, serta port berbasis environment.
- [ ] Pindahkan migration multi-tujuan, backfill, dan integritas laporan.
- [ ] Verifikasi kompatibilitas migration terhadap dump PostgreSQL lama.
- [ ] Perbarui `CHANGELOG.md`.
- [ ] Jalankan test/lint backend.
- [ ] Commit dan push checkpoint Batch 2.

## Batch 3 — Migrasi Frontend

- [ ] Tulis/pertahankan test service, utility, dan komponen fitur baru.
- [ ] Port konfigurasi API URL lokal/production.
- [ ] Port editor jadwal multi-tujuan admin.
- [ ] Port resolver timeline tujuan/presensi.
- [ ] Port halaman laporan berbasis route `suratId`.
- [ ] Port report deadline dan lock state.
- [ ] Port perbaikan Dashboard dan Presensi Pegawai.
- [ ] Pastikan asset/script legacy tidak menyebabkan error bootstrap.
- [ ] Perbarui `CHANGELOG.md`.
- [ ] Jalankan test, lint terarah, dan build frontend.
- [ ] Commit dan push checkpoint Batch 3.

## Batch 4 — Paket Deploy Aman

- [ ] Bangun frontend production.
- [ ] Sinkronkan hasil build ke `backend/public` secara deterministik.
- [ ] Buat manifest file deploy dan file yang harus dipertahankan di hosting.
- [ ] Verifikasi `.env`, credentials, token, uploads, dan dump tidak terlacak Git.
- [ ] Tambahkan preflight PostgreSQL/version/schema.
- [ ] Dokumentasikan backup, migration, smoke test, dan rollback.
- [ ] Perbarui `CHANGELOG.md`.
- [ ] Jalankan regression suite final.
- [ ] Commit dan push checkpoint Batch 4.

## Batch 5 — Konsolidasi dan Pembersihan Disk

- [ ] Pastikan seluruh source penting dari `v2` dan `vOLD` sudah terwakili.
- [ ] Pastikan repository dan remote berisi commit recovery final.
- [ ] Hentikan runtime comparison lama.
- [ ] Hapus `v2`, `vOLD`, source duplikat, build lama, dan dependency cache yang dapat dibuat ulang.
- [ ] Jangan hapus dump, uploads, `.env`, credentials, atau backup tanpa target arsip yang jelas.
- [ ] Jalankan install bersih, test, build, dan smoke test setelah pembersihan.
- [ ] Catat ruang disk yang diperoleh dalam `CHANGELOG.md`.
- [ ] Commit dan push checkpoint Batch 5.

## Definition of Done

- [ ] Struktur final hanya memiliki satu FE dan satu BE aktif.
- [ ] Seluruh perubahan fitur kemarin tersedia pada baseline resmi.
- [ ] Tidak ada bentrok route/static frontend pada backend deploy.
- [ ] Migration lulus pada salinan database legacy.
- [ ] Test FE dan BE serta build production lulus.
- [ ] Secret dan runtime data tidak masuk Git.
- [ ] Deploy/rollback guide lengkap.
- [ ] Folder recovery besar telah dibersihkan secara aman.
