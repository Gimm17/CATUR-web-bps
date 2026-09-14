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

### 2026-09-14 — TASK-012 — Timeline multi-tujuan dan durasi presensi

- **Status:** Selesai dengan catatan baseline lint proyek.
- **Ringkasan:** Progres dan riwayat laporan kini menampilkan seluruh tujuan satu surat secara berurutan; durasi presensi dihitung dari gabungan tanggal unik semua tujuan dan response progres menyertakan tujuan aktif WITA.
- **File ditambahkan:** `src/features/surat-tugas/tujuanDuration.js` dan `src/features/surat-tugas/tujuanDuration.test.js`.
- **File diubah:** `backend/src/controllers/laporan.controller.js`, `backend/tests/integration/laporan.explicit-assignment.test.js`, `src/pages/pegawai/LaporanPegawai.jsx`, `src/pages/pegawai/LaporanPegawai.test.jsx`, `src/pages/pegawai/ReportLaporanPegawai.jsx`, `src/pages/pegawai/ReportLaporanPegawai.test.jsx`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `countScheduledDays`; `hitungDurasiSuratTugas` dan `cekPresensiLengkap` menerima tujuan; `buildPerjalananResponse` mengurutkan tujuan dan menentukan `tujuan_aktif`; kedua halaman laporan merender rangkaian tujuan.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data permanen yang diubah; fixture integration dibersihkan setelah test.
- **API:** `GET /api/perjalanan/surat/:suratId` kini menjamin `tujuan[]` berurutan berdasarkan `urutan` dan mengirim `tujuan_aktif` yang dihitung dari tanggal WITA. Record legacy tetap memakai envelope tanggal surat.
- **Test otomatis:** RED util terverifikasi gagal karena module belum ada; RED UI terverifikasi pada progres dan riwayat yang hanya menampilkan lokasi legacy. GREEN util 3/3, test terarah frontend 11/11, seluruh frontend 28/28, backend explicit-assignment 5/5, backend lint 81 file, lint file frontend Task 12 lulus kecuali 2 error baseline halaman progres, dan build production lulus.
- **Verifikasi manual:** Buol 14–16 dan Tolitoli 17–19 menghasilkan durasi 6 hari; tanggal overlap hanya dihitung sekali; setiap baris menampilkan nomor urut, nama daerah, periode, dan badge `Aktif hari ini` bila ID sama dengan `tujuan_aktif`.
- **Risiko/catatan:** Perhitungan menggunakan tanggal UTC murni untuk menghindari drift timezone browser. Header legacy hanya menjadi fallback ketika child tujuan kosong.
- **Rollback:** Hapus util/timeline, pulihkan durasi envelope tunggal, dan keluarkan `tujuan_aktif` dari response progres; tidak ada rollback database.
- **Commit:** `feat: show multi-destination report timeline`.

### 2026-09-14 — TASK-011 — Deadline dan status penguncian laporan

- **Status:** Selesai dengan catatan baseline lint proyek.
- **Ringkasan:** Menambahkan presenter report window dan kartu deadline yang menjelaskan masa edit atau alasan penguncian; seluruh aksi mutasi laporan dinonaktifkan dan dijaga ketika backend menyatakan laporan tidak editable.
- **File ditambahkan:** `src/features/laporan/reportWindow.js` dan `src/features/laporan/reportWindow.test.js`.
- **File diubah:** `src/pages/pegawai/LaporanPegawai.jsx`, `src/pages/pegawai/LaporanPegawai.test.jsx`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `getReportWindowPresentation`, `guardReportEditable`, `getActionErrorMessage`, dan `refreshAfterLockConflict`; komponen progres menampilkan section deadline dan state disabled pada edit, TTD, nota, reset, serta kirim.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data yang diubah.
- **API:** Mengonsumsi `report_window` backend tanpa menghitung ulang timezone di browser. Response mutasi 409 memicu refresh GET context dan alasan backend ditampilkan kepada pengguna.
- **Test otomatis:** RED presenter terverifikasi gagal karena module belum ada; RED page terverifikasi gagal karena kartu lock belum tersedia. GREEN lulus 9/9 untuk presenter dan halaman, seluruh frontend lulus 24/24, production build lulus, serta semua file baru bersih lint. Halaman induk masih memiliki 2 error lint baseline lama.
- **Verifikasi manual:** Kondisi aktif, hari terakhir, deadline lewat, dan proses keuangan menghasilkan tone/judul berbeda; kartu menampilkan `trip_end_date`, `deadline_date`, `timezone`, serta `remaining_days`; tombol mutasi memiliki tooltip alasan saat disabled.
- **Risiko/catatan:** Disable frontend hanya UX. Middleware backend Task 6 tetap menolak request terlambat; penanganan 409 menutup celah state browser yang basi.
- **Rollback:** Hapus presenter dan kartu deadline, pulihkan state tombol/guard, serta hapus test Task 11; backend enforcement tidak berubah.
- **Commit:** `feat: show report deadline and lock state`.

### 2026-09-14 — TASK-010 — Halaman progres terikat route ID

- **Status:** Selesai dengan catatan baseline lint proyek.
- **Ringkasan:** Halaman progres laporan kini mengambil `suratId` dari URL dan meneruskannya ke seluruh operasi laporan; perubahan ID meremount context agar state surat sebelumnya tidak pernah terbawa.
- **File ditambahkan:** `src/pages/pegawai/LaporanPegawai.test.jsx`.
- **File diubah:** `src/pages/pegawai/LaporanPegawai.jsx` dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Memisahkan `LaporanPerjalananContent` dan wrapper `LaporanPerjalanan`; `fetchData`, `fetchTTD`, upload/reset nota, upload TTD, edit laporan harian, refresh, serta kirim laporan akhir kini memakai ID eksplisit.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data yang diubah.
- **API:** GET progres, TTD, nota, reset, upload, dan kirim menggunakan `/perjalanan/surat/:suratId`; edit harian menggunakan `/presensi/:presensiId/laporan` melalui signature service baru.
- **Test otomatis:** RED terverifikasi 2/2 gagal karena pemanggilan lama tidak membawa ID dan route tidak memuat ulang context. GREEN lulus 4/4 pada `LaporanPegawai.test.jsx`, seluruh frontend lulus 19/19, dan production build lulus. Test baru bersih lint; halaman masih memiliki 2 error baseline terkait side effect `fetchTTD` dan komponen modal inline.
- **Verifikasi manual:** Perpindahan `/laporan/11` ke `/laporan/22` menghasilkan fetch kedua untuk ID 22; TTD, nota, reset, edit presensi ID 91, dan kirim akhir tetap berada pada context surat 11.
- **Risiko/catatan:** Wrapper memakai `key={suratId}` untuk reset menyeluruh data, preview, modal, error, dan stage. Response 404 menampilkan pesan kepemilikan aman; kode lock 409 menampilkan alasan dari `report_window`.
- **Rollback:** Kembalikan halaman menjadi satu komponen tanpa route param, pulihkan signature pemanggilan service lama, dan hapus test context route.
- **Commit:** `fix: bind report page actions to route id`.

### 2026-09-14 — TASK-009 — Dashboard dan riwayat berbasis surat ID

- **Status:** Selesai dengan catatan baseline lint proyek.
- **Ringkasan:** Semua aksi laporan pada dashboard dan tabel riwayat kini membuka laporan untuk surat tugas yang dipilih secara eksplisit, bukan context generik atau record terakhir.
- **File ditambahkan:** `src/pages/pegawai/ReportLaporanPegawai.test.jsx`.
- **File diubah:** `src/pages/pegawai/Dashboard.jsx`, `src/pages/pegawai/ReportLaporanPegawai.jsx`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `DashboardPegawai.handleLaporanClick` memakai `useNavigate` dan `surat.id`; `ReportLaporanPegawai` menambahkan kolom aksi, accessible name, reset pagination pada filter, serta key baris stabil.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data yang diubah.
- **API:** Tidak ada endpoint baru; semua tautan menggunakan route frontend `/laporan/:suratId` yang meneruskan context ke endpoint eksplisit Task 4–7.
- **Test otomatis:** RED terverifikasi 2/2 gagal karena tabel lama belum memiliki link aksi. GREEN lulus 2/2 pada `ReportLaporanPegawai.test.jsx`, seluruh frontend lulus 15/15, dan production build lulus. Lint dua file riwayat lulus; `Dashboard.jsx` masih memiliki 5 error dan 1 warning baseline terkait deklarasi fungsi/komponen di dalam komponen induk, bukan routing yang diubah pada task ini.
- **Verifikasi manual:** Surat A ID 11 menuju `/laporan/11`, Surat B ID 22 menuju `/laporan/22`, dan surat tanpa laporan menampilkan tombol `Lanjutkan`; nomor surat masuk ke accessible name setiap aksi.
- **Risiko/catatan:** Halaman progres tujuan route tersebut baru meneruskan `suratId` ke seluruh service pada Task 10. Peringatan bundle Vite di atas 500 kB tetap merupakan utang performa terpisah.
- **Rollback:** Pulihkan link dashboard ke route generik, hapus kolom aksi riwayat dan test Task 9, serta kembalikan key baris lama.
- **Commit:** `fix: open selected report from dashboard history`.

### 2026-09-14 — TASK-008 — Routing laporan yang aman

- **Status:** Selesai dengan catatan baseline lint proyek.
- **Ringkasan:** Memisahkan resolver surat aktif dari halaman progres, melindungi route laporan pegawai, mengarahkan menu utama ke riwayat, dan mengubah halaman laporan-surat lama menjadi redirect kompatibilitas.
- **File ditambahkan:** `src/pages/pegawai/LaporanEntry.jsx` dan `src/pages/pegawai/LaporanEntry.test.jsx`.
- **File diubah:** `src/App.jsx`, `src/fragments/Sidebar.pegawai.jsx`, `src/pages/pegawai/LaporanBySurat.jsx`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Implementasi lama `LaporanBySurat` diganti penuh oleh redirect; path file tetap ada.
- **Class/fungsi/komponen diubah:** Menambahkan komponen `LaporanEntry`; menyederhanakan `LaporanBySurat`; mengubah konfigurasi route `App` dan navigasi `Sidebar`.
- **Database:** Tidak ada.
- **API:** Resolver memakai `getSuratTugasAktif`; tidak ada fallback ke surat terbaru. Route utama adalah `/laporan/:suratId`, `/laporan` hanya resolver, `/laporan-report` riwayat, dan `/laporan-surat/:id` redirect kompatibilitas.
- **Test otomatis:** RED terverifikasi karena `LaporanEntry` belum tersedia. GREEN lulus 4/4 pada `LaporanEntry.test.jsx`; seluruh frontend lulus 13/13. Lint terarah lima file Task 8 lulus; lint global tetap memiliki utang baseline yang dicatat pada Task 7.
- **Verifikasi manual:** Surat aktif ID 41 menuju `/laporan/41`; response 404 menuju `/laporan-report`; kegagalan 500 menampilkan retry; URL lama ID 55 menuju `/laporan/55`.
- **Risiko/catatan:** Menu sidebar tidak lagi membuka context laporan generik dan diberi label `Riwayat Laporan`. Dashboard akan diarahkan ke route ID pada Task 9.
- **Rollback:** Kembalikan route `/laporan` langsung ke `LaporanPegawai`, restore implementasi lama `LaporanBySurat`, dan pulihkan link sidebar.
- **Commit:** `fix: route reports by selected assignment`.

### 2026-09-14 — TASK-007 — Kontrak service frontend berbasis surat ID

- **Status:** Selesai dengan catatan baseline lint proyek.
- **Ringkasan:** Seluruh service laporan frontend kini mewajibkan ID surat tugas dan membangun endpoint eksplisit; penyimpanan laporan harian menggunakan ID presensi pada URL.
- **File ditambahkan:** `src/services/laporan.service.test.js`.
- **File diubah:** `src/services/laporan.service.js`, `src/services/presensiService.js`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `requireSuratId`; mengubah signature `getLaporanPerjalanan`, `kirimLaporanAkhir`, `uploadTTD`, `getTTD`, `uploadBuktiPembayaran`, `getBuktiPembayaran`, `resetBuktiPembayaran`, dan `submitLaporan`.
- **Database:** Tidak ada.
- **API:** Semua request laporan memakai `/perjalanan/surat/:suratId/...`; laporan harian memakai `/presensi/:presensiId/laporan`. ID kosong/non-integer ditolak sebelum request dan ID tidak diduplikasiasikan ke body.
- **Test otomatis:** RED terverifikasi 4 kegagalan pada URL/signature lama. GREEN lulus 4/4 pada `laporan.service.test.js`. Lint terarah untuk tiga file Task 7 lulus. `npm run lint` global tetap gagal pada baseline: ESLint lama memindai backend CommonJS sebagai browser ESM dan `src/**` memiliki 33 error/15 warning lama; perubahan Task 7 tidak menambah error.
- **Verifikasi manual:** URL GET, kirim, TTD, nota, reset, dan laporan harian diverifikasi melalui test double boundary Axios; interceptor token tetap berada di `src/api/axios.js`.
- **Risiko/catatan:** Semua pemanggil lama harus diperbarui untuk mengirim `suratId`; pekerjaan tersebut dijadwalkan pada Task 8–10. Utang konfigurasi/global lint perlu task tersendiri agar tidak mencampur refactor ratusan file dengan perbaikan laporan.
- **Rollback:** Pulihkan signature tanpa ID dan endpoint generik pada dua service, lalu hapus test kontrak.
- **Commit:** `refactor: require assignment id in report services`.

### 2026-09-14 — TASK-006 — Enforcement deadline laporan harian dan akhir

- **Status:** Selesai
- **Ringkasan:** Menegakkan batas edit tujuh hari WITA dan penguncian status proses pada backend untuk laporan harian, pengiriman laporan akhir, tanda tangan, serta nota; response penolakan membawa report window agar alasan dapat ditampilkan frontend.
- **File ditambahkan:** `backend/tests/integration/laporan.edit-window.test.js`.
- **File diubah:** `backend/src/controllers/presensi.controller.js`, `backend/src/routes/presensi.routes.js`, `backend/src/controllers/laporan.controller.js`, `backend/src/middlewares/reportContext.middleware.js`, `backend/src/routes/laporan.route.js`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `updateLaporan` kini memuat presensi berdasarkan ID dan kepemilikan lalu memanggil `getOwnedReportContext` serta `assertReportEditable`; menambahkan middleware `requireEditableReportContext`; mapping error laporan menyertakan `report_window`.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data permanen yang diubah. Integration fixture menguji laporan harian dan status laporan kemudian dibersihkan.
- **API:** Menambahkan `PUT /api/presensi/:presensiId/laporan`. Adapter `PUT /api/presensi/laporan` dipertahankan dan memberi header `Deprecation: true`. Operasi terkunci menghasilkan `409 REPORT_DEADLINE_PASSED` atau `409 REPORT_LOCKED_BY_STATUS` beserta `report_window`.
- **Test otomatis:** RED terverifikasi: route berbasis ID menghasilkan 404, adapter tidak memiliki header deprecation, dan error akhir tidak membawa report window. GREEN lulus 5/5 pada `laporan.edit-window.test.js`; seluruh backend lulus 59/59 tanpa skip; backend lint lulus 81 file.
- **Verifikasi manual:** Edit tepat pada hari ketujuh berhasil; satu hari setelahnya ditolak; status `dicek_keuangan` menolak edit walau deadline belum lewat; adapter lama tetap bekerja; kirim laporan terkunci mengembalikan deadline dan alasan.
- **Risiko/catatan:** Guard eksplisit dijalankan sebelum middleware upload sehingga file tidak dikirim ke storage ketika laporan sudah terkunci. Route legacy dipertahankan hanya untuk kompatibilitas mobile sementara.
- **Rollback:** Lepas route ID baru dan `requireEditableReportContext`, pulihkan lookup `presensi_id` body tanpa report window, serta hapus header deprecation. Tidak ada rollback database.
- **Commit:** `feat: enforce report editing deadline`.

### 2026-09-14 — TASK-005 — Endpoint write laporan berdasarkan surat tugas

- **Status:** Selesai
- **Ringkasan:** Mengikat kirim laporan, tanda tangan pegawai, serta manifest nota ke surat tugas eksplisit sehingga operasi pada Surat A tidak dapat membaca atau mengubah data Surat B.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `backend/src/controllers/laporan.controller.js`, `backend/src/routes/laporan.route.js`, `backend/src/middlewares/reportContext.middleware.js`, `backend/tests/integration/laporan.explicit-assignment.test.js`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `resolveSuratFromRequest` dan `sendControllerError`; handler `kirimLaporanAkhir`, `uploadTTDPegawai`, `getTTDPegawai`, `validateUploadBuktiPembayaran`, `uploadBuktiPembayaran`, `getBuktiPembayaran`, serta `resetBuktiPembayaran` menggunakan report context terpilih.
- **Database:** Tidak ada tabel, kolom, index, atau enum baru. Pengiriman ulang meng-update record pasangan `(surat_tugas_id, pegawai_id)` yang sama; race unique dipetakan menjadi `409 REPORT_ALREADY_EXISTS`.
- **API:** Menambahkan `POST /api/perjalanan/surat/:suratId/kirim`, `POST|GET /api/perjalanan/surat/:suratId/ttd-pegawai`, dan `POST|GET|DELETE /api/perjalanan/surat/:suratId/bukti-pembayaran`. Body `surat_tugas_id` yang tidak sama dengan URL ditolak dengan `400 SURAT_ID_MISMATCH`.
- **Test otomatis:** RED terverifikasi karena route eksplisit belum tersedia (404 HTML). GREEN lulus 5/5 pada `laporan.explicit-assignment.test.js`; seluruh backend lulus 54/54 tanpa skip; backend lint lulus 81 file. Generator dokumen dan Google Drive diganti test double pada integration boundary agar test tidak melakukan upload eksternal.
- **Verifikasi manual:** Kirim laporan A memperbarui kesimpulan A tanpa mengubah B; GET TTD A mengarah ke file A; reset manifest A tidak menghapus manifest B; konflik ID URL/body ditolak.
- **Risiko/catatan:** Route legacy masih tersedia untuk kompatibilitas dan hanya menggunakan assignment aktif. Semua route write eksplisit memverifikasi kepemilikan sebelum pemrosesan file.
- **Rollback:** Lepas enam route eksplisit dan kembalikan resolver handler ke assignment aktif; file manifest dan data laporan yang sudah ada tidak perlu dimigrasikan.
- **Commit:** `fix: scope report writes to assignment id`.

### 2026-09-14 — TASK-004 — Endpoint read progres berdasarkan surat tugas

- **Status:** Selesai
- **Ringkasan:** Menambahkan endpoint progres laporan berbasis `suratId`, menyatukan pembentukan response progres, dan menghapus fallback legacy yang sebelumnya memilih surat terbaru ketika tidak ada tugas aktif pada tanggal WITA.
- **File ditambahkan:** `backend/tests/integration/laporan.explicit-assignment.test.js`.
- **File diubah:** `backend/src/controllers/laporan.controller.js`, `backend/src/routes/laporan.route.js`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `buildPerjalananResponse` dan `getLaporanPerjalananBySuratId`; `findPreferredSuratForUser` kini menggunakan `resolveActiveAssignment`; `getLaporanPerjalanan` mengembalikan error stabil bila tidak ada tugas aktif.
- **Database:** Tidak ada tabel, kolom, index, enum, atau data permanen yang diubah; integration fixture dibersihkan setelah test.
- **API:** Menambahkan `GET /api/perjalanan/surat/:suratId`. `GET /api/perjalanan` kini menghasilkan `404 NO_ACTIVE_ASSIGNMENT` tanpa fallback ke surat terbaru dan `409 ACTIVE_ASSIGNMENT_CONFLICT` bila jadwal aktif ambigu.
- **Test otomatis:** RED terverifikasi: endpoint eksplisit menghasilkan 404 HTML dan endpoint legacy salah menghasilkan 200 dengan surat terakhir. GREEN lulus 2/2 pada `laporan.explicit-assignment.test.js`; seluruh backend lulus 51/51 tanpa skip; backend lint lulus 81 file.
- **Verifikasi manual:** Dua surat milik pegawai yang sama diminta berdasarkan ID dan menghasilkan surat, tujuan, kesimpulan, serta report window masing-masing tanpa tertukar.
- **Risiko/catatan:** Client lama yang mengandalkan fallback surat terakhir harus beralih ke endpoint eksplisit; endpoint legacy tetap tersedia hanya untuk tugas yang benar-benar aktif hari ini.
- **Rollback:** Hapus route eksplisit dan handler/builder, lalu pulihkan resolver legacy pada controller. Tidak ada rollback database.
- **Commit:** `fix: load report progress by assignment id`.

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
