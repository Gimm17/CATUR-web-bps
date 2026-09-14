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

### 2026-09-14 — TASK-003 — Report context dan validasi kepemilikan

- **Status:** Selesai
- **Ringkasan:** Menambahkan service dan middleware bersama untuk memuat satu surat tugas secara eksplisit, memastikan surat tersebut milik pengguna login, mengurutkan tujuan, memuat laporan pasangan surat-pegawai, dan menghitung report window WITA yang sesuai status laporan.
- **File ditambahkan:** `backend/src/services/reportContext.service.js`, `backend/src/middlewares/reportContext.middleware.js`, dan `backend/tests/unit/reportContext.service.test.js`.
- **File diubah:** `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `createReportContextService`, `getOwnedReportContext`, `createLoadOwnedReportContext`, dan `loadOwnedReportContext`.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data yang diubah. Service hanya membaca `surat_tugas`, `surat_tugas_tujuan`, dan `laporan_perjalanan`.
- **API:** Belum mendaftarkan route baru. Middleware menghasilkan `req.reportContext` berisi `{ surat, laporan, reportWindow }` untuk endpoint eksplisit pada task berikutnya.
- **Test otomatis:** RED terverifikasi karena module service belum tersedia. GREEN lulus 6/6 pada `reportContext.service.test.js`; backend lint lulus 81 file.
- **Verifikasi manual:** ID kosong/non-integer ditolak sebelum query; surat tidak ada maupun milik pegawai lain sama-sama menghasilkan `404 SURAT_NOT_FOUND`; tujuan diurutkan; status keuangan mengunci report window; error internal disamarkan.
- **Risiko/catatan:** Model runtime dimuat secara lazy agar unit test tidak membuka koneksi database. Response 404 yang seragam mencegah enumerasi surat milik pengguna lain.
- **Rollback:** Hapus service, middleware, dan test Task 3; belum ada route yang perlu dilepas.
- **Commit:** `feat: add owned report context`.

### 2026-09-14 — TASK-002 — Integritas schema laporan

- **Status:** Selesai
- **Ringkasan:** Menambahkan status awal `draft`, mencegah lebih dari satu laporan untuk pasangan surat tugas dan pegawai yang sama, serta menambahkan pemeriksaan startup agar schema yang belum dimigrasikan gagal secara eksplisit.
- **File ditambahkan:** `backend/migrations/20260914-enforce-report-integrity.sql` dan `backend/tests/integration/laporan.schema.test.js`.
- **File diubah:** `backend/src/models/laporan.perjalanan.js`, `backend/src/utils/ensureSchema.js`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Enum `status` dan deklarasi index pada model `LaporanPerjalanan`; menambahkan `assertReportIntegritySchema` pada pemeriksaan schema startup.
- **Database:** Tidak ada tabel atau kolom yang ditambah/dihapus. Enum `enum_laporan_perjalanan_status` ditambah nilai `draft`; unique index `uq_laporan_perjalanan_surat_pegawai` ditambahkan pada `(surat_tugas_id, pegawai_id)`. Preflight menemukan 0 pasangan duplikat. Migration diterapkan pada `catur_test` dan `catur_dev`.
- **API:** Tidak ada endpoint yang diubah; write berikutnya akan menerima constraint database sebagai perlindungan race condition.
- **Test otomatis:** RED terverifikasi dengan dua kegagalan: enum belum memuat `draft` dan duplicate belum ditolak. GREEN lulus 2/2 pada `laporan.schema.test.js`; seluruh backend lulus 43/43 tanpa skip; backend lint lulus 79 file.
- **Verifikasi manual:** Metadata PostgreSQL memverifikasi `draft_enum=true` dan `unique_index=true` setelah migration pada database development.
- **Risiko/catatan:** Backup sebelum migration tersimpan di `C:\Users\HP\PostgreSQL\backups\catur_dev-before-report-integrity-20260914-122647.dump` (4.949.025 byte). Nilai enum PostgreSQL tidak dihapus otomatis saat rollback karena penghapusan nilai enum memerlukan rekonstruksi tipe.
- **Rollback:** Jalankan `DROP INDEX IF EXISTS uq_laporan_perjalanan_surat_pegawai;`, kembalikan model/startup check, dan pulihkan dump hanya jika rollback data diperlukan. Nilai enum `draft` aman dibiarkan tidak terpakai.
- **Commit:** `fix: enforce report record integrity`.

### 2026-09-14 — TASK-001 — Utilitas tanggal WITA dan report window

- **Status:** Selesai
- **Ringkasan:** Menambahkan perhitungan tanggal akhir perjalanan, deadline tujuh hari kalender, sisa hari, status editable, dan alasan penguncian laporan berdasarkan tanggal WITA serta status proses.
- **File ditambahkan:** `backend/src/services/reportWindow.service.js` dan `backend/tests/unit/reportWindow.service.test.js`.
- **File diubah:** `backend/src/utils/businessDate.js` dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `differenceInBusinessDates`, `getLastDestinationEndDate`, `buildReportWindow`, dan `assertReportEditable`.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data yang diubah.
- **API:** Tidak ada endpoint yang diubah; service ini menjadi kontrak internal untuk task endpoint berikutnya.
- **Test otomatis:** RED terverifikasi karena module `reportWindow.service` belum ada. GREEN lulus 13/13 pada `reportWindow.service.test.js`; backend lint lulus 79 file.
- **Verifikasi manual:** Boundary hari terakhir pukul 23:59:59 WITA tetap editable; pukul 00:00 hari berikutnya terkunci; status proses keuangan terkunci sebelum deadline.
- **Risiko/catatan:** Status yang tidak dikenal diperlakukan terkunci secara fail-closed. Surat legacy tanpa child tujuan menggunakan `surat_tugas.tanggal_selesai`.
- **Rollback:** Hapus `reportWindow.service.js` beserta test dan kembalikan export `differenceInBusinessDates` dari `businessDate.js`.
- **Commit:** `feat: add WITA report edit window`.

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
