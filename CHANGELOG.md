# Changelog

Semua perubahan penting pada CATUR Web dicatat dalam file ini. Format mengikuti prinsip Keep a Changelog, ditambah detail teknis yang diperlukan untuk audit proyek.

## Aturan Pembaruan Wajib

1. Setiap task implementation plan harus menambahkan satu record sebelum task di-commit.
2. Task belum dianggap selesai jika record changelog belum ditulis.
3. Satu record wajib mencantumkan status, ringkasan, file, simbol kode, database, API, test, verifikasi manual, risiko, rollback, dan commit.
4. Credential, token, password, isi `.env`, dan data pribadi tidak boleh dicatat.
5. Jika suatu bagian tidak berubah, tulis `Tidak ada`, jangan menghilangkan bagian tersebut.
6. Record terbaru ditempatkan paling atas di bawah `Unreleased`.

## [Unreleased]

### 2026-09-14 — PRE-001 — Perbaikan fixture integration test schema tujuan

- **Status:** Selesai
- **Ringkasan:** Melengkapi fixture SQL pada test unique order tujuan dengan timestamp wajib sehingga integration test menguji constraint yang dimaksud, bukan gagal lebih awal pada validasi `NOT NULL`.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `backend/tests/integration/suratTugasTujuan.schema.test.js`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Helper lokal `insertTujuan` pada integration test menambahkan `created_at` dan `updated_at` menggunakan `NOW()`.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data permanen yang diubah; seluruh fixture dijalankan di dalam transaksi dan di-rollback.
- **API:** Tidak ada endpoint yang diubah.
- **Test otomatis:** Frontend baseline 5/5 lulus. Backend baseline dengan `catur_test` aktif lulus 28/28 tanpa skip setelah sebelumnya mereproduksi kegagalan fixture `23502` pada `created_at`.
- **Verifikasi manual:** DDL migration, model Sequelize, fixture test, dan metadata kolom `catur_test` dibandingkan. Kegagalan konsisten berasal dari fixture raw SQL yang tidak mengirim timestamp.
- **Risiko/catatan:** Perubahan hanya pada test; behavior produksi tidak berubah.
- **Rollback:** Kembalikan penambahan `created_at`, `updated_at`, dan dua `NOW()` pada helper `insertTujuan`.
- **Commit:** `test: fix destination schema fixture timestamps`.

### 2026-09-14 — PLAN-001 — Spesifikasi dan implementation plan perbaikan laporan web

- **Status:** Selesai
- **Ringkasan:** Menerjemahkan transkrip ketua tim menjadi spesifikasi terukur dan implementation plan untuk pemilihan laporan berdasarkan surat tugas, riwayat, multi-tujuan, serta tenggat tujuh hari WITA.
- **File ditambahkan:**
  - `docs/superpowers/specs/2026-09-14-perbaikan-laporan-per-surat-web.md`
  - `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`
  - `CHANGELOG.md`
- **File diubah:** Tidak ada.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Tidak ada; task ini hanya menghasilkan dokumentasi perencanaan.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data yang diubah oleh task perencanaan.
- **API:** Tidak ada endpoint runtime yang diubah.
- **Test otomatis:** Tidak dijalankan karena belum ada kode runtime yang diubah.
- **Verifikasi manual:** Spesifikasi dicocokkan dengan transkrip; plan diperiksa untuk cakupan requirement, urutan dependensi, path file, kontrak fungsi, rollback, dan kewajiban update changelog per task.
- **Risiko/catatan:** File implementation plan lama yang disebut dalam percakapan tidak tersedia di clone C maupun backup E, sehingga plan baru dibuat sebagai sumber eksekusi resmi.
- **Rollback:** Hapus tiga dokumen perencanaan ini jika plan dibatalkan; tidak ada perubahan runtime atau database yang perlu dipulihkan.
- **Commit:** `docs: add report workflow implementation plan`.

## Baseline Sebelum Plan Baru

### 2026-09-09 — BASELINE-001 — Dukungan awal surat tugas multi-tujuan

- **Status:** Sudah ada sebelum plan baru
- **Ringkasan:** Branch `feature/multi-destination-location` pada commit `3dec4234d3b2ac00052764da8ef38ccc39208a6a` menambahkan editor multi-tujuan dan validasi jadwal awal.
- **File ditambahkan:**
  - `src/features/surat-tugas/TujuanScheduleEditor.jsx`
  - `src/features/surat-tugas/TujuanScheduleEditor.test.jsx`
  - `src/features/surat-tugas/tujuanSchedule.js`
  - `src/test/setup.js`
- **File diubah:**
  - `backend/src/controllers/suratTugas.controller.js`
  - `backend/tests/integration/suratTugas.write.test.js`
  - `src/pages/admin/suratTugasCreate.jsx`
  - `package.json`
  - `package-lock.json`
  - `vite.config.js`
- **File dihapus:** Tidak ada berdasarkan commit baseline.
- **Class/fungsi/komponen diubah:** `createSuratTugas`, `update`, `TujuanScheduleEditor`, `createNextTujuan`, `getTujuanScheduleErrors`, dan `serializeTujuan`.
- **Database:** Menggunakan tabel `surat_tugas_tujuan` yang sudah tersedia melalui migration tanggal 9 September 2026; tidak ada tabel yang dihapus.
- **API:** Payload create/update surat tugas menerima array `tujuan`.
- **Test otomatis:** Terdapat test editor frontend dan integration test penulisan surat tugas.
- **Verifikasi manual:** Belum dicatat pada baseline lama.
- **Risiko/catatan:** Flow laporan masih memakai pemilihan record otomatis dan belum sepenuhnya menggunakan `surat_tugas_id` eksplisit.
- **Rollback:** Kembali ke commit sebelum `3dec423` hanya jika seluruh fitur multi-tujuan dibatalkan.
- **Commit:** `3dec4234d3b2ac00052764da8ef38ccc39208a6a`.
