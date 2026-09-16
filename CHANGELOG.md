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

### 2026-09-16 — TASK-040 — Perpanjang batas edit laporan menjadi sepuluh hari

- **Status:** Selesai diimplementasikan dan diverifikasi secara lokal.
- **Ringkasan:** Mengubah masa edit laporan perjalanan dari tujuh menjadi sepuluh hari kalender setelah tanggal selesai tujuan terakhir. Hari ke-10 tetap dapat digunakan sampai pukul 23:59:59 WITA; laporan terkunci mulai hari berikutnya atau segera ketika status masuk proses keuangan.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `backend/src/services/reportWindow.service.js`, `backend/tests/unit/reportWindow.service.test.js`, `backend/tests/unit/reportContext.service.test.js`, `backend/tests/integration/laporan.edit-window.test.js`, `frontend/src/features/changelog/releaseNotes.js`, `frontend/src/App.changelog.test.jsx`, `frontend/src/pages/pegawai/LaporanPegawai.test.jsx`, `docs/deployment/PANDUAN_UPDATE_SERVER_BPS.md`, `docs/superpowers/specs/2026-09-14-perbaikan-laporan-per-surat-web.md`, `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `buildReportWindow` memakai konstanta `REPORT_EDIT_WINDOW_DAYS = 10`; regression test boundary WITA dan report context disesuaikan; versi popup changelog dinaikkan agar informasi aturan baru tampil kembali setelah login.
- **Database:** Tidak ada perubahan tabel, kolom, index, migration, maupun data. Deadline dihitung dinamis oleh backend dari tanggal selesai perjalanan sehingga data laporan lama otomatis mengikuti aturan sepuluh hari.
- **API:** Struktur endpoint dan kontrak response tidak berubah. Nilai `report_window.deadline_date`, `remaining_days`, dan `editable` sekarang mengikuti jendela sepuluh hari.
- **Test otomatis:** RED terverifikasi: test aturan sepuluh hari gagal karena backend masih menghasilkan deadline tujuh hari. GREEN: seluruh backend test lulus 69/69 tanpa skip menggunakan `catur_test`, seluruh frontend test lulus 62/62, lint backend lulus 81 file, lint khusus tiga file frontend yang berubah lulus, dan build production berhasil memproses 945 module. Full lint frontend masih melaporkan tiga error lama `react-hooks/set-state-in-effect` pada `RichTextEditor.jsx` yang tidak diubah oleh task ini.
- **Verifikasi manual:** Untuk perjalanan yang berakhir 19 September 2026, deadline yang diharapkan adalah 29 September 2026 WITA; laporan editable sepanjang 29 September dan terkunci mulai 30 September, selama belum masuk proses keuangan.
- **Risiko/catatan:** Perubahan memperpanjang akses koreksi tiga hari dan tidak membuka kembali laporan yang sudah masuk proses keuangan. Riwayat changelog lama yang menyebut aturan tujuh hari dipertahankan sebagai catatan kondisi pada task saat itu.
- **Rollback:** Kembalikan `REPORT_EDIT_WINDOW_DAYS` menjadi `7`, kembalikan versi/teks release note, lalu build ulang frontend.
- **Commit:** `feat: extend report edit window to ten days`.

### 2026-09-16 — TASK-039 — Paket update penuh untuk server BPS lama

- **Status:** Selesai dibuat dan diverifikasi secara lokal; siap diserahkan untuk deployment server BPS.
- **Ringkasan:** Membuat paket update in-place berisi hasil build frontend production, source backend lengkap, tiga migration database berurutan, precheck, post-deploy verification, checksum SHA-256, dan panduan deployment/rollback. Strategi database memakai migration agar data produksi lama tetap dipertahankan, bukan menimpa database dengan dump lokal.
- **File ditambahkan:** `docs/deployment/PANDUAN_UPDATE_SERVER_BPS.md`, `docs/deployment/00_PRECHECK_DATABASE.sql`, dan `docs/deployment/04_VERIFY_DATABASE.sql`. Artefak lokal yang diabaikan Git: `release/CATUR-BPS-UPDATE-20260916-FINAL.zip` beserta folder staging paketnya.
- **File diubah:** `CHANGELOG.md`; `backend/public` diregenerasi dari build frontend dan tetap diabaikan Git.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Tidak ada perubahan logika aplikasi baru; task ini mengemas hasil seluruh perbaikan dan fitur sebelumnya.
- **Database:** Tidak ada data yang dihapus atau diganti. Ketiga migration dijalankan ulang secara idempotent pada `catur_dev`; hasil verifikasi menunjukkan 97 surat tugas memiliki 97 tujuan, struktur baru lengkap, tidak ada surat tanpa tujuan, tidak ada laporan duplikat, dan 17 presensi legacy yang tidak dapat dipetakan aman tetap bernilai null.
- **API:** Tidak ada kontrak endpoint baru pada task packaging.
- **Test otomatis:** Build production berhasil memproses 945 module. Seluruh frontend test lulus 62/62 dan seluruh backend test lulus 69/69 tanpa skip menggunakan `catur_test`. Precheck, ketiga migration, dan post-deploy verification SQL seluruhnya selesai dengan exit code 0. Ekstraksi ulang paket menghasilkan 103 file dengan 102 checksum valid, tanpa `.env`, credential Google, token, uploads, `node_modules`, startup `index.js`, dump penuh database, maupun URL API lokal.
- **Verifikasi manual:** Struktur paket memuat `public`, `src`, `migrations`, `database-tools`, panduan deploy, changelog, versi, dan manifest checksum. Panduan mewajibkan backup, migration berurutan, pergantian folder dengan backup, restart, smoke test, dan prosedur rollback.
- **Risiko/catatan:** Migration integritas laporan akan berhenti jika database resmi memiliki pasangan `surat_tugas_id`/`pegawai_id` ganda; precheck disediakan untuk mendeteksinya sebelum perubahan. File startup dan secret server resmi sengaja tidak disertakan agar tidak bentrok.
- **Rollback:** Pulihkan database, `src`, dan `public` dari backup yang diwajibkan panduan deployment.
- **Commit:** `docs: add BPS in-place update deployment kit`.

### 2026-09-16 — TASK-038 — Export database untuk handoff deployment

- **Status:** Selesai dibuat secara lokal dan siap dibagikan secara privat kepada atasan/deployer.
- **Ringkasan:** Membuat export SQL portable dari schema aplikasi `public` pada database lokal terbaru untuk import ke PostgreSQL 10. File dikemas bersama panduan import dan metadata PostgreSQL 17 yang tidak kompatibel dengan PostgreSQL 10 telah dikeluarkan.
- **File ditambahkan:** `database-export/README_IMPORT_DATABASE.md`. Artefak lokal yang sengaja diabaikan Git: `database-export/catur_dev_2026-09-16.sql` dan `database-export/catur_dev_2026-09-16.zip`.
- **File diubah:** `.gitignore` dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Tidak ada.
- **Database:** Tidak ada perubahan data, tabel, kolom, index, maupun migration. Export hanya membaca schema `public`; schema pembanding internal tidak ikut dibagikan.
- **API:** Tidak ada perubahan endpoint atau kontrak respons.
- **Test otomatis:** Validasi artefak memastikan file SQL tidak memuat schema pembanding maupun perintah `\\restrict`, `\\unrestrict`, `transaction_timeout`, dan `default_table_access_method` dari PostgreSQL 17. Isi ZIP diverifikasi memuat SQL serta panduan import.
- **Verifikasi manual:** File ZIP siap pada `database-export/catur_dev_2026-09-16.zip`. Panduan mencantumkan import melalui `psql` dan pgAdmin serta peringatan kerahasiaan data.
- **Risiko/catatan:** Export memuat data aplikasi dan hash password pengguna, sehingga wajib dibagikan hanya melalui kanal privat. File SQL dan ZIP dilindungi `.gitignore` agar tidak ikut ter-push ke GitHub.
- **Rollback:** Tidak diperlukan karena export bersifat read-only. Hapus artefak lokal hanya setelah atasan mengonfirmasi salinan tersimpan aman.
- **Commit:** `docs: add PostgreSQL handoff export guide`.

### 2026-09-16 — TASK-037 — Hapus dua akun login lokal tambahan

- **Status:** Selesai pada database development lokal; database staging telah diverifikasi dan tidak memuat akun tersebut.
- **Ringkasan:** Menghapus tepat dua akun tambahan yang sebelumnya dibuat untuk pengujian lokal, masing-masing berperan sebagai admin dan pegawai. Akun resmi hasil `dump.sql` tidak disentuh.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Tidak ada.
- **Database:** Menghapus user ID 134 dan 135 dari tabel `users` pada `catur_dev`. Pemeriksaan sebelum penghapusan membuktikan keduanya tidak memiliki relasi pada tabel `surat_tugas`, `presensi`, `laporan`, `laporan_perjalanan`, maupun `notifikasi`. Jumlah user lokal berubah dari 104 menjadi 102 dan tidak ada akun domain pengujian lokal yang tersisa. Schema, tabel, kolom, index, dan data operasional lain tidak berubah.
- **API:** Tidak ada perubahan endpoint atau kontrak respons. Token sesi lama milik dua akun yang dihapus tidak lagi mempunyai user yang valid di database lokal.
- **Test otomatis:** Tidak ada test source yang diperlukan untuk perubahan data terarah ini.
- **Verifikasi manual:** Query pascapenghapusan menghasilkan nol akun pengujian lokal. Database staging `caturv2.gimmhost.my.id` juga diperiksa dan sejak awal menghasilkan nol akun yang cocok, sehingga tidak menjalankan operasi hapus di staging.
- **Risiko/catatan:** Password/hash kedua akun sengaja tidak dibackup agar credential uji benar-benar terhapus. File ZIP build yang sudah ada di workspace tidak diubah.
- **Rollback:** Akun dapat dibuat ulang melalui manajemen akun dengan email dan password baru; credential lama tidak dapat dipulihkan dari proyek.
- **Commit:** `docs: record removal of local test accounts`.

### 2026-09-16 — TASK-036 — Sederhanakan label menu sidebar pegawai

- **Status:** Selesai diimplementasikan, dipush ke GitHub, dan dideploy ke staging.
- **Ringkasan:** Mengganti label `Dashboard Sensus` menjadi `Dashboard` serta `Report` menjadi `Daftar Laporan` pada sidebar desktop dan navigasi mobile pegawai tanpa mengubah URL maupun fungsi halaman.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `frontend/src/fragments/Sidebar.pegawai.jsx`, `frontend/src/fragments/Sidebar.pegawai.test.jsx`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Komponen `Sidebar` pegawai dan regression test label navigasi.
- **Database:** Tidak ada perubahan.
- **API:** Tidak ada perubahan endpoint atau kontrak respons.
- **Test otomatis:** Regression test sidebar lulus 2/2, ESLint dua file perubahan lulus, dan build production berhasil memproses 945 module.
- **Verifikasi manual:** Asset staging `index-DLtNQCDs.js` merespons HTTP 200, memuat `Daftar Laporan`, dan tidak lagi memuat `Dashboard Sensus`. Kedua link tetap menuju `/dashboard` dan `/laporan-report`.
- **Risiko/catatan:** Badge tahun `2026` pada menu Dashboard tetap dipertahankan. Backup build sebelumnya tersedia di `/home/gimmhost/backups/caturv2-20260916-4a90961/public-previous`.
- **Rollback:** Pulihkan `public-previous` dari backup staging atau kembalikan dua label menjadi `Dashboard Sensus` dan `Report`, lalu build ulang.
- **Commit:** `fix: rename employee sidebar labels`.

### 2026-09-16 — TASK-035 — Deploy pembersihan console dan profil aman

- **Status:** Selesai dideploy ke `https://caturv2.gimmhost.my.id`.
- **Ringkasan:** Mempublikasikan backend dan frontend commit `50f958a` sehingga kondisi tanpa tugas aktif tidak lagi menghasilkan request merah, bundle production tidak mencetak debug console, dan endpoint profil tidak lagi mengekspos hash password.
- **File ditambahkan:** Tidak ada pada source aplikasi; hosting menerima direktori staging release dan backup rollback baru.
- **File diubah:** `CHANGELOG.md`; runtime hosting memperbarui `src/controllers/akun.controller.js`, `src/controllers/suratTugas.controller.js`, dan folder `public`.
- **File dihapus:** Tidak ada. Folder `public` lama dipindahkan secara utuh ke backup rollback.
- **Class/fungsi/komponen diubah:** Tidak ada perubahan source baru pada task deployment; task mempublikasikan `getProfil`, `getAktifByPegawai`, `getSuratTugasAktifAtauNull`, `sanitizeStoredUser`, dan konfigurasi build dari TASK-034.
- **Database:** Tidak ada tabel, kolom, index, migration, credential, atau data PostgreSQL yang diubah. Database production tidak disentuh.
- **API:** Smoke test terautentikasi menghasilkan HTTP 200 pada profil dengan field publik `id`, `nama`, `email`, `role`, `nip`, `alamat`, `telepon`, dan `unit_kerja` tanpa field sensitif. Endpoint aktif menghasilkan HTTP 200 serta `data: null` untuk akun yang tidak mempunyai perjalanan aktif hari ini.
- **Test otomatis:** Sebelum deployment, backend 69/69 dan frontend 62/62 lulus; lint backend serta ESLint file perubahan lulus; build production berhasil. Setelah deployment, root dan asset `index-DElKOAtc.js` menghasilkan HTTP 200, sedangkan login uji tidak valid tetap HTTP 401.
- **Verifikasi manual:** Bundle staging tidak mengandung marker `Memulai load data dashboard`, `Current user`, `Debug Presensi`, atau pemanggilan `console.*`. Pemeriksaan respons profil memastikan `hasSensitiveProfileField=false`; pemeriksaan surat aktif memastikan `activeDataIsNull=true` dengan status 200.
- **Risiko/catatan:** Build production membuang seluruh pemanggilan console dari frontend, sehingga diagnosis production berikutnya sebaiknya memakai Network/API response atau layanan monitoring terstruktur. `.env`, credential Google, uploads, dan database tidak ditimpa.
- **Rollback:** Backup tersedia di `/home/gimmhost/backups/caturv2-20260916-50f958a/`. Pulihkan dua controller dari subfolder `controllers`, ganti `public` dengan `public-previous`, lalu sentuh `tmp/restart.txt`.
- **Commit:** `docs: record console cleanup deployment`.

### 2026-09-16 — TASK-034 — Bersihkan console production dan lindungi profil pengguna

- **Status:** Selesai diimplementasikan, dipush ke GitHub, dan dideploy ke staging.
- **Ringkasan:** Menghilangkan request merah yang sebelumnya muncul saat pegawai tidak memiliki tugas aktif, membuang seluruh pemanggilan `console` dan `debugger` dari bundle production, menghentikan pengiriman hash password melalui endpoint profil, serta membersihkan field sensitif yang mungkin masih tersimpan pada `localStorage` browser dari release lama.
- **File ditambahkan:** `backend/tests/unit/akun.profile.test.js`, `frontend/src/config/productionBuild.js`, `frontend/src/config/productionBuild.test.js`, dan `frontend/src/utils/auth.test.js`.
- **File diubah:** `backend/src/controllers/akun.controller.js`, `backend/src/controllers/suratTugas.controller.js`, `backend/tests/integration/suratTugas.active.test.js`, `frontend/src/services/surat.service.js`, `frontend/src/services/surat.service.test.js`, `frontend/src/utils/auth.js`, `frontend/vite.config.js`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `getProfil` hanya memilih atribut profil publik; `getAktifByPegawai` mengembalikan hasil kosong normal; `getSuratTugasAktifAtauNull` tetap memilih konteks surat mendatang/selesai tanpa bergantung pada HTTP error; `getUser` dan `sanitizeStoredUser` membuang field bernama password, token, atau secret; `productionBuildConfig` menghapus console/debugger hanya pada hasil build.
- **Database:** Tidak ada tabel, kolom, index, enum, migration, credential, atau data permanen yang diubah. Integration test hanya membuat fixture sementara pada `catur_test` dan membersihkannya kembali.
- **API:** `GET /api/surat-tugas/aktif` tetap mengembalikan objek surat ketika aktif dan `409 ACTIVE_ASSIGNMENT_CONFLICT` ketika ambigu. Kondisi normal tanpa tugas aktif berubah dari HTTP 404 menjadi HTTP 200 dengan `{ data: null, message }`. `GET /api/user/profil` tidak lagi memilih atau mengirim atribut `password`.
- **Test otomatis:** Siklus RED mereproduksi kebocoran atribut password, fallback yang gagal memahami respons kosong 200, data sensitif lama pada storage, serta ketiadaan aturan strip console. GREEN: backend 69/69 lulus tanpa skip menggunakan PostgreSQL `catur_test`; frontend 62/62 lulus; lint backend dan ESLint file perubahan lulus; build production memproses 945 module.
- **Verifikasi manual:** Bundle release `index-DElKOAtc.js` tidak mengandung marker `Memulai load data dashboard`, `Current user`, `Debug Presensi`, maupun pemanggilan `console.*`. Halaman tetap dapat memakai surat selesai sebagai konteks read-only tanpa menjadikannya tugas aktif pada tanggal WITA.
- **Risiko/catatan:** Kontrak kosong 200 sengaja dipakai karena tidak memiliki tugas aktif bukan kesalahan jaringan. Client lama tetap dapat membaca objek surat aktif; selama rolling deployment singkat, frontend lama akan menerima envelope kosong tanpa crash tetapi banner fallback baru lengkap setelah frontend baru aktif. Error ekstensi Chrome berbentuk `VM... reportAllChanges/startTime` berada di luar bundle aplikasi.
- **Rollback:** Kembalikan status kosong ke 404, hapus pengenalan envelope kosong dan konfigurasi build production, lalu tambahkan kembali atribut password pada profil hanya bila benar-benar diperlukan (tidak direkomendasikan). Tidak ada rollback database.
- **Commit:** `fix: sanitize production console and active assignment response`.

### 2026-09-16 — TASK-033 — Deploy stabilisasi navigasi laporan

- **Status:** Selesai dideploy ke `https://caturv2.gimmhost.my.id`.
- **Ringkasan:** Mempublikasikan build frontend dari commit `0b37226635799124023c012a65678ad4e759dc10` yang memperbaiki logo BPS pada route laporan bertingkat, mempertahankan layout ketika laporan default dipilih, dan mengurangi pemilihan laporan menjadi satu request daftar surat.
- **File ditambahkan:** Tidak ada pada source aplikasi; deployment membuat arsip dan folder rollback build sebelumnya.
- **File diubah:** `CHANGELOG.md` pada repository dan folder runtime `/home/gimmhost/caturv2.gimmhost.my.id/public` pada hosting.
- **File dihapus:** Tidak ada. Folder `public` sebelumnya dipindahkan secara utuh ke backup rollback.
- **Class/fungsi/komponen diubah:** Tidak ada perubahan source baru pada task deployment; komponen yang dipublikasikan adalah `Sidebar`, `LaporanEntry`, dan resolver `getSuratTugasLaporanDefault` dari TASK-032.
- **Database:** Tidak ada tabel, kolom, index, migration, credential, maupun data yang diubah. Database PostgreSQL produksi tidak disentuh.
- **API:** Tidak ada endpoint atau kontrak backend yang diubah. Negative smoke test `POST /api/auth/login` tetap mencapai backend dan menghasilkan HTTP 401 untuk credential uji yang sengaja salah.
- **Test otomatis:** Build yang dideploy sebelumnya lulus seluruh frontend 59/59 dan ESLint file perubahan. Verifikasi deployment menghasilkan HTTP 200 untuk halaman utama, JavaScript `index-CDP6fcJa.js`, CSS, serta `/img/logo.png`; MIME logo terverifikasi `image/png`.
- **Verifikasi manual:** HTML produksi menunjuk ke asset build baru; bundle server memuat `/img/logo.png` dan teks loading `Menyiapkan laporan perjalanan`; akses publik `.env` ditolak dengan HTTP 403; jumlah file pada `uploads` tetap 274 sebelum dan sesudah deployment.
- **Risiko/catatan:** Backup rollback tersimpan di `/home/gimmhost/backups/caturv2-20260916-0b37226/`. Deployment hanya mengganti `public`; `.env`, credential, backend, database, dan `uploads` tidak ditimpa.
- **Rollback:** Pindahkan build `public` saat ini ke lokasi karantina, pulihkan `/home/gimmhost/backups/caturv2-20260916-0b37226/public-previous` sebagai `/home/gimmhost/caturv2.gimmhost.my.id/public`, lalu sentuh `tmp/restart.txt`.
- **Commit:** `docs: record report navigation deployment`.

### 2026-09-16 — TASK-032 — Stabilkan navigasi Laporan & Statistik

- **Status:** Selesai diimplementasikan, dipush ke GitHub, dan dideploy ke hosting.
- **Ringkasan:** Memperbaiki logo BPS yang berubah menjadi fallback pada route bertingkat `/laporan/:id`, menghilangkan layar putih polos selama pemilihan laporan default, dan mengurangi resolver laporan dari dua request berurutan menjadi satu request daftar surat.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `frontend/src/fragments/Sidebar.pegawai.jsx`, `frontend/src/fragments/Sidebar.pegawai.test.jsx`, `frontend/src/pages/pegawai/LaporanEntry.jsx`, `frontend/src/pages/pegawai/LaporanEntry.test.jsx`, `frontend/src/services/surat.service.js`, `frontend/src/services/surat.service.test.js`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `Sidebar` memakai `/img/logo.png` yang absolut; `LaporanEntry` mempertahankan `PegawaiLayout` pada state loading, kosong, dan error; `getSuratTugasLaporanDefault` memilih surat aktif atau surat selesai terbaru dari satu respons `/surat-tugas/`. Ditambahkan helper jadwal internal untuk tanggal WITA, multi-tujuan, tanggal selesai terakhir, dan deteksi konflik surat aktif.
- **Database:** Tidak ada tabel, kolom, index, migration, credential, atau data yang diubah.
- **API:** Tidak ada endpoint atau kontrak backend yang diubah. Frontend tidak lagi memakai respons 404 dari `GET /api/surat-tugas/aktif` sebagai control flow halaman laporan; resolver memakai satu `GET /api/surat-tugas/` yang sudah memfilter data pegawai login.
- **Test otomatis:** Siklus RED mereproduksi enam kegagalan logo, layout, serta resolver dan satu guard konflik. GREEN focused test lulus 17/17 dan seluruh frontend lulus 59/59. ESLint keenam file perubahan lulus tanpa error. Build production memproses 945 module dan menghasilkan `index-CDP6fcJa.js`; warning ukuran chunk lama tetap ada.
- **Verifikasi manual:** Bundle production memuat path absolut `/img/logo.png` dan loading state `Menyiapkan laporan perjalanan`. URL akhir tetap kanonik `/laporan/:suratId`; pemilihan surat memprioritaskan jadwal aktif, termasuk tujuan multi-lokasi, kemudian surat selesai terbaru, serta menolak kondisi lebih dari satu surat aktif.
- **Risiko/catatan:** Endpoint `/surat-tugas/aktif` tetap digunakan oleh Dashboard dan Presensi sehingga string endpoint masih ada di bundle; hanya flow masuk Laporan & Statistik yang tidak lagi memanggilnya. Tidak ada backend yang perlu diganti saat deployment task ini.
- **Rollback:** Pulihkan path logo relatif, tampilan state polos, dan resolver dua request. Rollback tidak direkomendasikan karena mengembalikan logo rusak, layar putih, serta jeda request 404.
- **Commit:** `fix: stabilize report navigation loading`.

### 2026-09-15 — TASK-031 — Perbaiki Network Error login pada perangkat lain

- **Status:** Selesai diimplementasikan, dipush ke GitHub, dan dideploy ke hosting.
- **Ringkasan:** Memperbaiki build hosting yang sebelumnya membawa URL API lokal `http://127.0.0.1:3000/api`. Proses release sekarang selalu menghasilkan URL API same-origin `/api`, sehingga browser pada laptop atau jaringan lain mengirim login ke backend hosting yang benar dan tidak terkena mixed-content HTTP di halaman HTTPS.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `scripts/build-release.js`, `scripts/release-layout.js`, `scripts/release-layout.test.js`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `getProductionBuildEnvironment`; `build-release.js` menggunakan environment production tersebut ketika menjalankan Vite. Konfigurasi `.env.local` tidak diubah agar development lokal tetap memakai backend `127.0.0.1:3000`.
- **Database:** Tidak ada tabel, kolom, index, migration, credential, atau data yang diubah.
- **API:** Tidak ada endpoint atau kontrak respons yang berubah. Perubahan hanya memastikan frontend production memanggil endpoint same-origin `/api`, bukan loopback milik perangkat pengguna.
- **Test otomatis:** Siklus RED menghasilkan kegagalan `getProductionBuildEnvironment is not a function`; GREEN lulus 3/3 pada `release-layout.test.js`. Seluruh test frontend lulus 55/55. `node --check` lulus untuk kedua script release. Full ESLint masih melaporkan tiga error baseline yang tidak terkait pada `frontend/src/pages/pegawai/RichTextEditor.jsx` dan sembilan warning legacy; file itu tidak disentuh oleh task ini.
- **Verifikasi manual:** Build production memproses 945 module dan menghasilkan `index-BxlyoavJ.js`. Pemeriksaan lokal membuktikan `HAS_127=False`, `HAS_HTTP_LOCAL_API=False`, dan `HAS_RELATIVE_API=True`. Setelah deployment, halaman dan JavaScript production merespons HTTP 200, bundle server menghasilkan `LOCALHOST_IN_BUNDLE=NO` serta `RELATIVE_API_IN_BUNDLE=YES`, dan request login same-origin mencapai backend dengan HTTP 401 untuk credential uji yang sengaja salah.
- **Risiko/catatan:** Aturan ini sengaja hanya diterapkan melalui `scripts/build-release.js`. Perintah `npm run dev` tetap membaca `.env.local`, sehingga server lokal tidak terganggu. Deployment harus memakai script release, bukan menyalin hasil build manual yang dibuat dengan environment lokal. Backup rollback hosting tersimpan di `/home/gimmhost/backups/caturv2-20260915-8711857/`; 274 file upload tetap utuh dan database tidak disentuh.
- **Rollback:** Kembalikan pemanggilan `spawnSync` ke `env: process.env`, hapus helper dan regression test. Rollback tidak direkomendasikan karena akan mengembalikan Network Error pada client produksi.
- **Commit:** `fix: use same-origin API in production release`.

### 2026-09-15 — TASK-030 — Deploy popup changelog terperinci ke hosting

- **Status:** Selesai dideploy ke `https://caturv2.gimmhost.my.id`.
- **Ringkasan:** Mempublikasikan build frontend dari commit `53b1722493282254e82b97ed057eddd772ee7410` yang memuat popup changelog pascalogin, delapan kelompok catatan rilis terperinci, penjelasan perubahan logika, area isi yang dapat digulir, serta preferensi `Jangan tampilkan lagi` per versi.
- **File ditambahkan:** Tidak ada pada source aplikasi; deployment membuat arsip rollback server `public-before-deploy.tgz`.
- **File diubah:** `CHANGELOG.md` pada repository dan folder runtime `/home/gimmhost/caturv2.gimmhost.my.id/public` pada hosting.
- **File dihapus:** Tidak ada. Folder `public` sebelumnya dipindahkan secara utuh ke backup rollback.
- **Class/fungsi/komponen diubah:** Tidak ada perubahan source baru pada task deployment; komponen yang dipublikasikan adalah `ChangelogPopup`, `RELEASE_NOTES`, dan integrasi global pada `App` dari TASK-028–029.
- **Database:** Tidak ada tabel, kolom, index, migration, credential, maupun data yang diubah. Database PostgreSQL produksi tidak disentuh.
- **API:** Tidak ada endpoint atau kontrak respons yang diubah. Negative smoke test `POST /api/auth/login` tetap menghasilkan HTTP 401 untuk credential tidak valid.
- **Test otomatis:** Build yang dideploy sebelumnya lulus seluruh test frontend 55/55, ESLint file perubahan, dan Vite production build 945 module. Verifikasi deployment menghasilkan HTTP 200 untuk halaman utama, JavaScript, dan CSS; TLS terverifikasi tanpa error.
- **Verifikasi manual:** HTML produksi menunjuk ke `/assets/index-zCixt3bW.js` dan `/assets/index-BYMfY65p.css`; bundle produksi memuat teks `8 pembaruan penting`, `Logika sistem`, dan `Jangan tampilkan lagi`; akses publik ke `.env` ditolak dengan HTTP 403; jumlah file pada `uploads` tetap 274 sebelum dan sesudah deployment.
- **Risiko/catatan:** Backup rollback tersimpan di `/home/gimmhost/backups/caturv2-20260915-53b1722/`. Pergantian dibatasi pada folder `public`; `.env`, `credential.json`, `credentials.json`, source backend, database, dan `uploads` tidak ditimpa.
- **Rollback:** Pindahkan build `public` saat ini ke lokasi karantina, lalu pulihkan `/home/gimmhost/backups/caturv2-20260915-53b1722/public-previous` sebagai `/home/gimmhost/caturv2.gimmhost.my.id/public` dan sentuh `tmp/restart.txt`.
- **Commit:** `docs: record changelog popup deployment`.

### 2026-09-15 — TASK-029 — Perinci changelog dan tambahkan area scroll

- **Status:** Selesai diimplementasikan, dipush ke GitHub, dan dideploy ke hosting.
- **Ringkasan:** Mengubah popup changelog ringkas menjadi catatan rilis panjang yang dapat digulir. Delapan kelompok pembaruan kini menjelaskan kondisi sebelumnya, logika sistem yang diterapkan, serta dampaknya bagi pengguna, termasuk aturan multi-tujuan, tanggal WITA, geofence, batas edit laporan, timeline proses, fallback legacy, dan konteks surat nonaktif.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `frontend/src/features/changelog/releaseNotes.js`, `frontend/src/features/changelog/ChangelogPopup.jsx`, `frontend/src/features/changelog/ChangelogPopup.css`, `frontend/src/App.changelog.test.jsx`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `RELEASE_NOTES` diperluas menjadi delapan record dengan field kategori, ringkasan, kondisi sebelumnya, logika, dan dampak; `ChangelogPopup` merender struktur detail tersebut dalam region scroll yang dapat difokuskan; layout popup memakai header/footer tetap dan body scroll khusus pada desktop maupun mobile.
- **Database:** Tidak ada tabel, kolom, index, migration, atau data yang diubah. Isi popup hanya menjelaskan migration dan fallback yang sudah ada.
- **API:** Tidak ada endpoint atau kontrak respons yang berubah. Konten tetap statis di frontend.
- **Test otomatis:** Siklus RED membuktikan area detail scroll dan penjelasan logika belum tersedia; GREEN regression popup 6/6 dan seluruh frontend 55/55 lulus. ESLint file perubahan lulus tanpa error. Build production berhasil memproses 945 module; warning ukuran chunk lama tetap ada.
- **Verifikasi manual:** Login kembali, pastikan popup versi terbaru tampil, gulir area tengah sampai pembaruan kedelapan, dan pastikan judul serta tombol aksi tetap terlihat. Ulangi pada viewport mobile untuk memastikan tiga panel detail tiap pembaruan tersusun vertikal.
- **Risiko/catatan:** `CHANGELOG_VERSION` dinaikkan menjadi `2026-09-15-task-029`, sehingga pengguna yang menyembunyikan versi sebelumnya tetap menerima catatan rilis yang lebih lengkap ini satu kali.
- **Rollback:** Pulihkan empat release note ringkas, struktur dua kolom lama, dan versi `task-028`; backend/database tidak memerlukan rollback.
- **Commit:** `53b1722493282254e82b97ed057eddd772ee7410` (`feat: expand release notes with logic details`).

### 2026-09-15 — TASK-028 — Popup changelog setelah login

- **Status:** Selesai diimplementasikan dan diterapkan pada release/runtime lokal; siap dipush ke GitHub.
- **Ringkasan:** Menambahkan popup `Yang baru di CATUR` setelah login berhasil untuk seluruh role. Pengguna dapat menutup popup untuk sesi saat ini melalui `Mengerti`, tombol X, atau Escape, maupun memilih `Jangan tampilkan lagi` untuk menyembunyikan versi changelog yang sama pada login berikutnya.
- **File ditambahkan:** `frontend/src/features/changelog/ChangelogPopup.jsx`, `frontend/src/features/changelog/ChangelogPopup.css`, `frontend/src/features/changelog/releaseNotes.js`, `frontend/src/App.changelog.test.jsx`, `frontend/src/auth/login.changelog.test.jsx`, dan `frontend/src/utils/browserNavigation.js`.
- **File diubah:** `frontend/src/App.jsx`, `frontend/src/auth/login.jsx`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `App` memasang `ChangelogPopup` secara global; proses login menandai sesi setelah token dan user diterima; `ChangelogPopup` mengelola pemicu per-login, penyembunyian per-versi, keyboard Escape, fokus awal, dan penguncian scroll; redirect browser login dipisahkan melalui `redirectBrowser` agar efek navigasi dapat diisolasi dalam test.
- **Database:** Tidak ada tabel, kolom, index, migration, maupun data yang diubah.
- **API:** Tidak ada endpoint atau kontrak respons yang berubah. Popup memakai release note statis frontend dan hanya dipicu setelah respons login berhasil.
- **Test otomatis:** Siklus RED membuktikan popup, aksi penyimpanan, persistensi setelah logout, keyboard Escape, serta marker login sebelumnya tidak tersedia; GREEN test terarah 6/6 dan seluruh frontend 54/54 lulus. ESLint seluruh file perubahan lulus tanpa error. Build production berhasil memproses 945 module; warning ukuran chunk lama tetap ada.
- **Verifikasi manual:** Logout lalu login kembali; popup harus muncul di halaman tujuan role. Klik `Mengerti`, kemudian login ulang untuk memastikan popup muncul kembali. Klik `Jangan tampilkan lagi`, logout/login ulang, dan pastikan popup versi ini tidak muncul lagi.
- **Risiko/catatan:** Versi yang disembunyikan disimpan pada `localStorage` dan cookie preferensi agar tetap bertahan walau mekanisme logout lama membersihkan local storage. Saat `CHANGELOG_VERSION` dinaikkan, popup versi baru akan tampil kembali.
- **Rollback:** Hapus pemasangan `ChangelogPopup` dari `App`, marker sesi dari login, komponen/config/style/test changelog, serta wrapper redirect; backend/database tidak memerlukan rollback.
- **Commit:** `feat: show release notes after login` (akan dibuat setelah verifikasi runtime lokal).

### 2026-09-15 — TASK-027 — Pisahkan editor laporan dari unduhan PDF dan lengkapi timeline

- **Status:** Selesai diimplementasikan dan diterapkan pada release/runtime lokal; siap dipush ke GitHub.
- **Ringkasan:** Tombol footer modal Detail Surat Tugas sekarang selalu bernama `Buka Laporan` dan menuju `/laporan/:suratId`, termasuk untuk perjalanan yang telah selesai atau sudah memiliki PDF. Unduhan PDF dipisahkan menjadi tombol `Download Laporan PDF` di bawah `Download Surat Tugas`. Detail progres diperluas menjadi sembilan tahap yang sama dengan alur pada halaman Laporan & Statistik.
- **File ditambahkan:** `frontend/src/utils/reportProcessTimeline.js` dan `frontend/src/utils/reportProcessTimeline.test.js`.
- **File diubah:** `frontend/src/pages/pegawai/Dashboard.jsx`, `frontend/src/utils/completedReportAction.js`, `frontend/src/utils/completedReportAction.test.js`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `DashboardPegawai` memuat konteks perjalanan lengkap ketika modal dibuka, memisahkan navigasi editor dan unduhan PDF, serta merender status `Selesai`, `Sedang Berjalan`, `Opsional`, atau `Menunggu`; `getCompletedReportAction` tidak lagi memilih aksi PDF; ditambahkan `mergeAssignmentReportContext` dan `buildReportProcessTimeline`.
- **Database:** Tidak ada tabel, kolom, index, enum, migration, atau data yang diubah. Kebijakan edit tetap memakai `report_window` backend: maksimal tujuh hari WITA setelah perjalanan berakhir dan terkunci ketika status masuk proses keuangan.
- **API:** Tidak ada endpoint atau kontrak respons baru. Modal memakai `GET /api/perjalanan/surat/:suratId` yang sudah tersedia untuk memperoleh presensi, laporan akhir, bukti pembayaran, pembayaran, dan `report_window` terbaru.
- **Test otomatis:** Siklus RED mereproduksi aksi salah yang membuka PDF dan ketiadaan pembentuk timeline; GREEN focused test 6/6 serta seluruh frontend 48/48 lulus. Test terarah backend untuk `report_window` dan konteks laporan menghasilkan 20 lulus, 0 gagal, dan 6 integration test database dilewati karena `CATUR_TEST_DATABASE_URL` tidak tersedia di sesi verifikasi. ESLint file perubahan lulus tanpa error dengan satu warning dependency hook legacy pada Dashboard. Build production berhasil memproses 941 module; warning ukuran chunk tetap ada dan tidak berasal dari task ini.
- **Verifikasi manual:** Buka Dashboard pegawai, pilih Detail surat selesai, pastikan footer `Buka Laporan` menuju `/laporan/:id`; bila PDF tersedia, pastikan tombol `Download Laporan PDF` muncul terpisah; periksa sembilan tahap timeline dan pastikan halaman laporan hanya editable dalam jendela tujuh hari serta sebelum proses keuangan.
- **Risiko/catatan:** Membuka halaman laporan tidak identik dengan hak edit. Backend tetap menjadi sumber kebenaran untuk mengunci form setelah deadline atau saat keuangan mulai memproses; laporan lama tetap dapat dibaca.
- **Rollback:** Pulihkan percabangan footer berdasarkan keberadaan PDF, hapus pemuatan konteks detail dan utility timeline baru; backend/database tidak memerlukan rollback.
- **Commit:** `fix: separate report editing from PDF download` (akan dibuat setelah verifikasi runtime lokal).

### 2026-09-15 — TASK-026 — Pertahankan konteks Laporan & Statistik tanpa redirect ke Report

- **Status:** Selesai dan diterapkan pada release/runtime lokal.
- **Ringkasan:** Memperbaiki regresi ketika menu `Laporan & Statistik` mengalihkan pegawai tanpa surat aktif ke `/laporan-report`. Halaman sekarang membuka surat aktif bila tersedia, atau surat selesai terbaru sebagai konteks laporan; halaman Report agregat hanya dibuka melalui menu `Report`.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `frontend/src/services/surat.service.js`, `frontend/src/services/surat.service.test.js`, `frontend/src/pages/pegawai/LaporanEntry.jsx`, `frontend/src/pages/pegawai/LaporanEntry.test.jsx`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `getSuratTugasLaporanDefault` dan seleksi deterministik surat selesai terbaru; `LaporanEntry` memakai hasil tersebut untuk route `/laporan/:suratId` serta menyediakan empty state tanpa redirect silang.
- **Database:** Tidak ada tabel, kolom, index, migration, maupun data yang diubah.
- **API:** Tetap memakai `GET /api/surat-tugas/aktif`; jika respons 404, frontend membaca `GET /api/surat-tugas/` untuk memilih surat selesai terbaru milik pegawai. Tidak ada endpoint atau format respons yang diubah.
- **Test otomatis:** Siklus RED mereproduksi hasil salah `/laporan-report` ketika 404; GREEN memastikan surat selesai terbaru ID 225 dipilih, surat mendatang diabaikan, dan kondisi tanpa laporan tetap berada pada halaman laporan. Focused test 12/12 serta seluruh frontend 44/44 lulus; ESLint empat file perubahan lulus.
- **Verifikasi manual:** Setelah release lokal diperbarui, klik `Laporan & Statistik` pada akun pegawai tanpa surat aktif; URL harus menjadi `/laporan/225` untuk dataset lokal saat ini, bukan `/laporan-report`.
- **Risiko/catatan:** Surat mendatang sengaja tidak dijadikan laporan default karena belum memiliki progres perjalanan. Error 404 surat aktif tetap merupakan bagian normal dari fallback, bukan kegagalan halaman.
- **Rollback:** Kembalikan `LaporanEntry` ke `getSuratTugasAktif` dan fallback `/laporan-report`, lalu hapus selector laporan default beserta test terkait; backend/database tidak memerlukan rollback.
- **Commit:** `fix: keep report statistics on latest assignment`.

### 2026-09-15 — TASK-025 — Pulihkan menu laporan sesuai frontend resmi BPS

- **Status:** Selesai dan siap dipublikasikan.
- **Ringkasan:** Memulihkan pemisahan navigasi pegawai yang sebelumnya tergabung menjadi `Riwayat Laporan`. Sidebar desktop kembali menampilkan `Laporan & Statistik` dan `Report`, sedangkan navigasi mobile kembali menyediakan `Laporan` dan `Report` sebagai dua tujuan berbeda. Alur laporan per surat hasil perbaikan tetap dipertahankan.
- **File ditambahkan:** `frontend/src/fragments/Sidebar.pegawai.test.jsx`.
- **File diubah:** `frontend/src/fragments/Sidebar.pegawai.jsx` dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Komponen `Sidebar` pegawai; ditambahkan penentuan status aktif terpisah untuk halaman laporan per surat dan halaman report agregat.
- **Database:** Tidak ada tabel, kolom, index, migration, maupun data yang diubah.
- **API:** Tidak ada kontrak API yang berubah. `Laporan & Statistik` mengarah ke `/laporan`, detail tetap dapat memakai `/laporan/:suratId` atau `/laporan-surat/:id`, dan `Report` mengarah ke `/laporan-report`.
- **Test otomatis:** Siklus RED membuktikan sidebar lama hanya menampilkan `Riwayat Laporan`; setelah implementasi, regression test sidebar 1/1 dan seluruh frontend 40/40 lulus. ESLint kedua file perubahan lulus dan build production 940 module berhasil.
- **Verifikasi manual:** Perlu hard refresh setelah release, kemudian login pegawai dan pastikan kedua menu tampil terpisah serta membuka halaman yang sesuai.
- **Risiko/catatan:** Navigasi mobile kini memiliki satu item tambahan agar setara dengan struktur menu resmi. Warning ukuran chunk Vite masih ada dan tidak berasal dari perubahan ini.
- **Rollback:** Pulihkan satu menu `Riwayat Laporan` menuju `/laporan-report` dan hapus regression test sidebar; backend serta database tidak memerlukan rollback.
- **Commit:** `fix: restore official employee report navigation`.

### 2026-09-15 — TASK-024 — Deploy production ke hosting PostgreSQL 10

- **Status:** Selesai; release aktif pada `https://caturv2.gimmhost.my.id`.
- **Ringkasan:** Men-deploy source backend resmi dan build frontend commit `12f262a` ke hosting baru yang mendukung Node.js dan PostgreSQL 10. Data legacy dipulihkan dari `dump.sql`, dilanjutkan tiga migration multi-tujuan/report secara berurutan, lalu aplikasi diaktifkan melalui CloudLinux Node.js Selector/Passenger.
- **File ditambahkan:** Tidak ada file source baru. Runtime hosting menerima source backend, build `public`, data peta, template, credential Google yang tersedia, dan uploads legacy.
- **File diubah:** `CHANGELOG.md`; di hosting dibuat `.env` production dengan permission `0600` serta konfigurasi Passenger pada `.htaccess`.
- **File dihapus:** Paket transfer sementara remote dihapus setelah verifikasi; arsip lokal dipindahkan ke Recycle Bin agar recoverable. Tidak ada data produksi yang dihapus.
- **Class/fungsi/komponen diubah:** Tidak ada perubahan source bisnis setelah commit `12f262a`.
- **Database:** Membuat database PostgreSQL production baru beserta user aplikasi, mengimpor dump PostgreSQL 10.23, lalu menjalankan `20260909-create-surat-tugas-tujuan.sql`, `20260909-backfill-surat-tugas-tujuan.sql`, dan `20260914-enforce-report-integrity.sql`. Hasil akhir: 102 users, 197 daerah, 97 surat tugas, 97 tujuan, 150 presensi, 34 laporan perjalanan, dan 215 notifikasi.
- **API:** Root dan SPA `/presensi` HTTP 200; asset JS/CSS HTTP 200; login invalid memberi JSON HTTP 401; API tidak dikenal tetap HTTP 404.
- **Test otomatis:** Gate lokal sebelum deploy: frontend 39/39, ESLint file perubahan lulus, build release 940 module lulus. Verifier schema production menghasilkan `SCHEMA_OK=true`.
- **Verifikasi manual:** Aplikasi Passenger berstatus `started` pada Node 20.20.2; PostgreSQL server/client 10.23 dapat diakses aplikasi; 274 file uploads legacy tersedia; permintaan publik ke `.env` ditolak HTTP 403 dan tidak membocorkan secret.
- **Risiko/catatan:** Token OAuth Google belum tersedia pada source lokal/hosting baru; fungsi yang membutuhkan upload baru ke Google Drive memerlukan `token.json` atau `GOOGLE_REFRESH_TOKEN`. Data/file lama dan fungsi non-Drive tetap terpasang. Hosting melaporkan filesystem keseluruhan 98% terpakai tetapi masih sekitar 51 GB tersedia.
- **Rollback:** Backup pra-deploy berada pada `/home/gimmhost/backups/caturv2-20260915-130328/`, berisi arsip site dan dump database sebelum restore. Stop aplikasi Passenger, pulihkan arsip tersebut, lalu restore dump bila rollback diperlukan.
- **Commit:** `chore: record caturv2 production deployment`.

### 2026-09-15 — TASK-023 — Pulihkan status surat berakhir pada halaman presensi

- **Status:** Selesai dan diterapkan pada release/runtime lokal.
- **Ringkasan:** Memulihkan banner `Surat Tugas Berakhir` yang tidak terjangkau setelah endpoint surat aktif diperketat berdasarkan tanggal WITA. Jika `/surat-tugas/aktif` mengembalikan 404, frontend kini mengambil riwayat milik user dan memilih surat mendatang terdekat; bila tidak ada, memilih surat selesai terbaru sebagai konteks read-only. Empty state murni hanya muncul bila user belum pernah memiliki surat.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `frontend/src/services/surat.service.js`, `frontend/src/services/surat.service.test.js`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `getSuratTugasAktifAtauNull` memperoleh fallback kontekstual; ditambahkan `getBusinessDateWita`, normalisasi tanggal, dan pemilihan fallback deterministik. `PresensiPegawai` tidak diubah karena komponen banner expired/upcoming sebelumnya masih tersedia dan kembali menerima data.
- **Database:** Tidak ada tabel, kolom, index, migration, maupun data yang diubah.
- **API:** Kontrak `GET /api/surat-tugas/aktif` tetap 404 ketika tidak ada tugas aktif agar logika presensi/lokasi tidak kembali memakai record terakhir. Frontend menggunakan `GET /api/surat-tugas/` hanya sebagai fallback read-only yang oleh backend otomatis dibatasi ke user login untuk role pegawai.
- **Test otomatis:** Siklus RED membuktikan 404 masih menghasilkan `null`; GREEN test service 4/4 dan seluruh frontend 39/39 lulus. ESLint dua file perubahan lulus; release-layout 2/2 dan build production 940 module lulus.
- **Verifikasi manual:** Release disinkronkan ke `backend/public`. Smoke API lokal membuktikan endpoint aktif user tanpa tugas tetap 404, login dua akun tes berhasil, dan user 87 memiliki empat surat dengan surat terbaru ID 225 berakhir 12 September 2026.
- **Risiko/catatan:** Surat fallback hanya mengaktifkan tampilan status expired/upcoming; form tagging tetap tidak dirender karena `suratStatus.isActive` bernilai false. Warning ukuran chunk Vite tetap ada dan tidak berkaitan dengan perubahan ini.
- **Rollback:** Pulihkan perilaku 404 menjadi `null` pada `getSuratTugasAktifAtauNull` dan hapus tiga test fallback; backend/database tidak memerlukan rollback.
- **Commit:** `fix: restore expired assignment status on attendance page`.

### 2026-09-15 — TASK-022 — Surat selesai tetap dapat membuka halaman laporan

- **Status:** Selesai dan diterapkan pada runtime lokal.
- **Ringkasan:** Memperbaiki aksi laporan pada modal detail Dashboard pegawai. Surat selesai tanpa file PDF sekarang menampilkan tombol hijau aktif `Buka Laporan` dan membuka `/laporan/:suratId`; tidak lagi tampil seperti tombol disabled berwarna abu-abu.
- **File ditambahkan:** `frontend/src/utils/completedReportAction.js` dan `frontend/src/utils/completedReportAction.test.js`.
- **File diubah:** `frontend/src/pages/pegawai/Dashboard.jsx` dan `CHANGELOG.md`.
- **File dihapus:** Script diagnosis sementara tidak masuk commit.
- **Class/fungsi/komponen diubah:** Menambahkan `getCompletedReportAction`; footer modal Dashboard menggunakan target route surat eksplisit serta state disabled hanya bila ID surat benar-benar tidak tersedia.
- **Database:** Tidak ada tabel, kolom, index, enum, migration, atau data yang diubah.
- **API:** Tidak ada perubahan kontrak. Diagnosis user 87 membuktikan `GET /api/perjalanan/surat/225`, `/207`, `/189`, dan `/175` seluruhnya HTTP 200, termasuk surat selesai tanpa laporan.
- **Test otomatis:** Siklus RED module action belum tersedia; GREEN 2/2. Seluruh frontend 37/37 lulus. Lint file perubahan lulus tanpa error dengan satu warning hook legacy Dashboard yang tidak berasal dari perubahan ini.
- **Verifikasi manual:** Build lokal diperbarui pada `127.0.0.1:3000`; pengguna perlu hard refresh lalu membuka Detail pada surat selesai tanpa PDF.
- **Risiko/catatan:** Akses halaman dan hak edit dibedakan. Surat selesai selalu dapat dibuka, tetapi aksi edit tetap mengikuti `report_window`; sesudah deadline halaman menjadi read-only.
- **Rollback:** Pulihkan cabang modal expired sebelumnya dan hapus utility/test baru; backend/database tidak perlu diubah.
- **Commit:** `fix: keep completed assignment reports accessible`.

### 2026-09-15 — TASK-021 — Clean install, konsolidasi final, dan pembersihan disk

- **Status:** Batch 5 selesai; codebase final bersih dan seluruh gate lokal lulus.
- **Ringkasan:** Menyinkronkan lockfile frontend agar `npm ci` berhasil, menghapus server/asset boilerplate yang tidak dipakai, memisahkan source Flutter, dan membersihkan seluruh duplikasi `vOLD`, `v2`, cache/build, serta runtime comparison.
- **File ditambahkan:** `docs/MIGRATION_REPORT.md`.
- **File diubah:** `frontend/package-lock.json`, `docs/superpowers/plans/2026-09-15-konsolidasi-codebase-resmi-bps.md`, dan `CHANGELOG.md`.
- **File dihapus:** `backend/server_upload.js`, `frontend/public/vite.svg`, dan `frontend/src/assets/react.svg`. Folder untracked `vOLD`, `v2`, build/cache lama, dan temporary comparison juga dihapus setelah diverifikasi.
- **Class/fungsi/komponen diubah:** Tidak ada fungsi bisnis diubah. Lockfile kini mencatat dependency peer `@popperjs/core` sehingga clean install reproducible.
- **Database:** Tidak ada schema/data production yang diubah. Regression memakai database `catur_test`.
- **API:** Login admin dan pegawai lokal berhasil; `/` dan `/dashboard-admin` 200; API yang tidak ada tetap 404.
- **Test otomatis:** Setelah `npm ci`: frontend 35/35, backend 68/68 tanpa skip, release-layout 2/2, backend lint 81 file, lint frontend terarah lulus, dan build production lulus.
- **Verifikasi manual:** Runtime gabungan dijalankan pada port sementara 3010, login dua role berhasil, SPA/static berhasil, lalu process dihentikan.
- **Risiko/catatan:** Audit dependency melaporkan 21 vulnerability frontend dan 18 backend; tidak dilakukan force upgrade. Bundle utama masih memiliki warning lebih dari 500 kB. Source Flutter aman di `C:\Users\HP\Laravel\CATUR-mobile-bps` (sekitar 94,9 MB). Ruang kosong C setelah cleanup sekitar 3,70 GB.
- **Rollback:** Source web dapat dipulihkan dari checkpoint GitHub. Source mobile berada di folder terpisah. Data runtime dan dump tidak dihapus.
- **Commit:** `chore: finalize official codebase cleanup`.

### 2026-09-15 — TASK-020 — Build release dan kontrak deploy tanpa bentrok

- **Status:** Batch 4 selesai; runtime gabungan frontend/backend lulus smoke test lokal.
- **Ringkasan:** Menambahkan builder release yang hanya menyinkronkan hasil Vite ke `backend/public`, mendokumentasikan urutan backup–migration–restart, dan mengunci daftar file runtime production yang tidak boleh ditimpa.
- **File ditambahkan:** `scripts/release-layout.js`, `scripts/release-layout.test.js`, `scripts/build-release.js`, dan `docs/DEPLOYMENT.md`.
- **File diubah:** `.gitignore`, `README.md`, `docs/superpowers/plans/2026-09-15-konsolidasi-codebase-resmi-bps.md`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada file terlacak. `backend/public` dibentuk ulang sebagai artefak lokal yang diabaikan Git.
- **Class/fungsi/komponen diubah:** Menambahkan `getReleaseLayout`; builder memvalidasi target tepat di `backend/public`, menjalankan build, memastikan `dist/index.html`, lalu menyinkronkan hasilnya.
- **Database:** Tidak ada perubahan schema/data pada batch ini. Dokumentasi mewajibkan backup dan urutan tiga migration sebelum restart.
- **API:** Runtime gabungan melayani SPA pada `/` dan `/dashboard-admin`; route API atau upload yang tidak ada tetap 404.
- **Test otomatis:** Release-layout 2/2 lulus; build 944 module lulus. Smoke HTTP: `/` 200, `/dashboard-admin` 200, `/api/does-not-exist` 404, dan `/uploads/does-not-exist.jpg` 404.
- **Verifikasi manual:** Verifikasi HTTP dilakukan pada backend port sementara 3010 menggunakan database lokal; proses sementara telah dihentikan setelah test.
- **Risiko/catatan:** `backend/public` tidak masuk Git. Untuk upload hosting, jalankan `node scripts/build-release.js` lalu sertakan folder hasil tersebut dalam paket deploy.
- **Rollback:** Gunakan arsip `public` dan commit production sebelumnya; file protected tidak perlu disentuh.
- **Commit:** `chore: add conflict-safe deployment workflow`.

### 2026-09-15 — TASK-019 — Frontend resmi dan API same-origin

- **Status:** Batch 3 selesai; seluruh regression frontend dan build lulus.
- **Ringkasan:** Memastikan source frontend resmi tetap membawa editor multi-tujuan, timeline, report window, route laporan eksplisit, dan perbaikan dashboard/presensi. Default API diubah menjadi `/api` same-origin agar build yang sama dapat berjalan di domain hosting tanpa hardcoded domain lama.
- **File ditambahkan:** `frontend/src/config/apiBaseUrl.js` dan `frontend/src/config/apiBaseUrl.test.js`.
- **File diubah:** `frontend/src/api/axios.js`, `frontend/src/utils/fileUrl.js`, `docs/superpowers/plans/2026-09-15-konsolidasi-codebase-resmi-bps.md`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `resolveApiBaseUrl` dan konstanta `API_BASE_URL`; Axios dan resolver file memakai satu sumber konfigurasi yang sama.
- **Database:** Tidak ada tabel, kolom, index, enum, migration, atau data yang diubah.
- **API:** Default production adalah endpoint relatif `/api`; development tetap dapat memakai `VITE_API_BASE_URL=http://127.0.0.1:3000/api` melalui `.env.local` yang tidak masuk Git.
- **Test otomatis:** Siklus RED module konfigurasi belum tersedia; GREEN test baru 2/2. Seluruh frontend 35/35 lulus, lint file yang disentuh lulus, dan build production lulus 944 module.
- **Verifikasi manual:** Belum dilakukan pada runtime gabungan; dijadwalkan setelah build disinkronkan ke `backend/public`.
- **Risiko/catatan:** Build menghasilkan warning ukuran chunk utama sekitar 1,12 MB; bukan blocker fungsi, tetapi code splitting menjadi pekerjaan optimasi berikutnya.
- **Rollback:** Pulihkan fallback domain absolut lama dan hapus module konfigurasi; database tidak memerlukan rollback.
- **Commit:** `fix: use deployment-safe frontend API base`.

### 2026-09-15 — TASK-018 — Backend resmi, migration eksplisit, dan startup aman

- **Status:** Batch 2 selesai; regression backend dengan database lulus tanpa skip.
- **Ringkasan:** Mempertahankan runtime hosting `v2` sambil membawa seluruh domain multi-tujuan/report-context dari perubahan kemarin. Startup backend kini hanya memeriksa kesiapan schema dan tidak lagi menjalankan DDL otomatis.
- **File ditambahkan:** `backend/tests/unit/ensureSchema.test.js`.
- **File diubah:** `backend/src/utils/ensureSchema.js`, `docs/superpowers/plans/2026-09-15-konsolidasi-codebase-resmi-bps.md`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** `ensureSchema` diubah menjadi verifier read-only dengan fungsi uji `verify(database)`; error `SCHEMA_MIGRATION_REQUIRED` mencantumkan tabel, kolom, enum, atau index yang belum tersedia.
- **Database:** Tidak ada DDL baru di luar tiga migration yang sudah ditetapkan. Test database menjalankan validasi tabel `surat_tugas_tujuan`, relasi presensi, enum laporan, unique index, dan kompatibilitas dump legacy.
- **API:** Tidak ada endpoint baru pada batch ini; kontrak aktif WITA, multi-tujuan, presensi, dan laporan eksplisit dipertahankan.
- **Test otomatis:** Siklus RED membuktikan verifier belum tersedia; GREEN 2/2. Seluruh backend 68/68 lulus tanpa skip menggunakan `catur_test`; lint backend lulus 81 file.
- **Verifikasi manual:** Belum dilakukan pada browser; API dan static runtime akan diuji setelah hasil build ditempatkan di backend.
- **Risiko/catatan:** Backend sekarang sengaja gagal start jika migration belum dijalankan. Ini mencegah aplikasi hidup dengan schema setengah jadi, tetapi urutan deploy wajib migration dahulu baru restart process.
- **Rollback:** Pulihkan `ensureSchema.js` sebelumnya bila perlu; perubahan ini tidak mengubah data sehingga tidak memerlukan restore database.
- **Commit:** `fix: make production schema startup read only`.

### 2026-09-15 — TASK-017 — Konsolidasi baseline resmi dan struktur frontend/backend

- **Status:** Batch 1 selesai; baseline terstruktur dan gate tanpa database lulus.
- **Ringkasan:** Menetapkan source React resmi `vOLD` sebagai frontend, mempertahankan backend berfitur lengkap dengan perilaku runtime hosting `v2`, serta memisahkan source menjadi `frontend/` dan `backend/` agar tidak ada source client duplikat saat deploy.
- **File ditambahkan:** `frontend/.env.example`, `docs/superpowers/specs/2026-09-15-konsolidasi-codebase-resmi-bps.md`, dan `docs/superpowers/plans/2026-09-15-konsolidasi-codebase-resmi-bps.md`.
- **File diubah:** `.gitignore`, `backend/package.json`, `backend/server.js`, `backend/src/app.js`, dan seluruh path source/config frontend dipindahkan dari root ke `frontend/` tanpa mengubah isi fiturnya.
- **File dihapus:** Tidak ada source fungsional yang dihapus pada batch ini. Path frontend lama di root digantikan oleh path `frontend/`.
- **Class/fungsi/komponen diubah:** Bootstrap server memakai `PORT` dari environment; static frontend dilayani dari `backend/public`; fallback SPA tidak menangkap route `/api` atau `/uploads`; lokasi uploads dibuat absolut terhadap backend.
- **Database:** Tidak ada tabel, kolom, index, enum, migration, atau data yang diubah.
- **API:** Kontrak endpoint tidak berubah. Endpoint API yang tidak dikenal tetap menghasilkan 404 dan tidak dikonversi menjadi `index.html`.
- **Test otomatis:** Frontend 33/33 lulus; build Vite production lulus; backend 39 lulus dan 27 integration test dilewati karena `CATUR_TEST_DATABASE_URL` belum diberikan pada proses ini; backend lint lulus 81 file.
- **Verifikasi manual:** Belum dilakukan pada browser setelah restrukturisasi; dijadwalkan setelah paket deploy terbentuk.
- **Risiko/catatan:** Folder recovery `v2`/`vOLD` belum dihapus. Hasil build frontend belum disalin ke `backend/public` sampai Batch 4.
- **Rollback:** Kembalikan commit Batch 1; source frontend kembali ke root dan server kembali ke listener development sebelumnya. Database tidak memerlukan rollback.
- **Commit:** `chore: consolidate official web codebase structure`.

### 2026-09-14 — TASK-016 — Pemulihan halaman tagging dan data dashboard pegawai

- **Status:** Selesai dan aktif pada environment development lokal; verifikasi klik browser oleh pengguna menunggu hard refresh.
- **Ringkasan:** Memperbaiki error bootstrap AdminLTE `Cannot read properties of undefined (reading 'fn')`, membedakan respons 404 surat aktif sebagai empty state yang valid, menyediakan kembali riwayat presensi milik pegawai, dan menghentikan pemanggilan timeline laporan tanpa ID surat.
- **File ditambahkan:** `backend/tests/unit/presensi.list.test.js`, `src/bootstrapScripts.test.js`, `src/services/surat.service.test.js`, `src/utils/activePresensiTimeline.js`, dan `src/utils/activePresensiTimeline.test.js`.
- **File diubah:** `backend/src/controllers/presensi.controller.js`, `backend/src/routes/presensi.routes.js`, `index.html`, `src/pages/pegawai/Dashboard.jsx`, `src/pages/pegawai/PresensiPegawai.jsx`, `src/services/surat.service.js`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Menambahkan `listPresensiSaya`, `getSuratTugasAktifAtauNull`, dan `loadActivePresensiTimeline`; `DashboardPegawai` kini hanya mengambil timeline bila `suratAktif.id` tersedia; `PresensiPegawai` tidak lagi mengubah kondisi tanpa tugas menjadi banner error.
- **Database:** Tidak ada tabel, kolom, index, enum, migration, atau data yang diubah.
- **API:** Menambahkan `GET /api/presensi` terautentikasi untuk mengambil riwayat presensi user login, terurut terbaru, beserta ringkasan surat dan metadata foto. Smoke test lokal user 87 menghasilkan HTTP 200 dengan 10 record. `GET /api/surat-tugas/aktif` tetap menggunakan HTTP 404 sebagai kontrak sah ketika tidak ada tugas pada tanggal WITA berjalan.
- **Test otomatis:** Siklus RED terverifikasi untuk fungsi/route yang belum tersedia. GREEN: frontend 33/33 lulus, backend 66/66 lulus tanpa skip pada `catur_test`, backend lint lulus 81 file, dan build produksi lulus. Lint halaman legacy masih memiliki baseline lama React Hooks; file utility/service baru bersih setelah test path diperbaiki.
- **Verifikasi manual:** Backend development direstart dan listen di port 3000; request bertoken ke `GET /api/presensi` berhasil. Frontend tetap listen di `127.0.0.1:5174`; pengguna perlu hard refresh lalu membuka Dashboard dan Tagging Perjadin untuk memastikan empty state netral serta console bebas error `fn`, `/api/presensi` 404, dan `suratId wajib diisi`.
- **Risiko/catatan:** User 87 memang tidak memiliki surat aktif pada 14 September 2026; empat suratnya berakhir pada 17 Juli, 14 Agustus, 9 September, dan 12 September 2026. Karena itu tampilan `Tidak Ada Surat Tugas Aktif` adalah hasil yang benar, bukan kehilangan data.
- **Rollback:** Hapus route GET riwayat dan controller-nya, pulihkan urutan script lama serta pemanggilan timeline lama, lalu restart backend. Tidak ada rollback database.
- **Commit:** `fix: restore employee attendance dashboard flow`.

### 2026-09-14 — TASK-015 — Terapkan database lama ke development lokal

- **Status:** Selesai pada environment development lokal; production belum diubah.
- **Ringkasan:** Mengganti schema `catur_dev` yang kosong dengan data `dump.sql` yang telah tervalidasi, mempertahankan akun lokal `@catur.test`, menjalankan seluruh migration terbaru, dan menghidupkan ulang backend.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `CHANGELOG.md`.
- **File dihapus:** Tidak ada; `dump.sql` asli tidak dimodifikasi.
- **Class/fungsi/komponen diubah:** Tidak ada.
- **Database:** `catur_dev` sekarang berisi 104 user, 197 daerah, 97 surat tugas, 97 tujuan, 150 presensi, 34 laporan perjalanan, dan 215 notifikasi. Sebanyak 133 presensi valid terpetakan ke tujuan; 17 presensi yatim dipertahankan; presensi valid tanpa tujuan berjumlah 0.
- **API:** Tidak ada perubahan kontrak. Smoke test lokal: `GET /api/surat-tugas` HTTP 200 dengan 97 row, `GET /api/surat-tugas/stats` HTTP 200, dan `GET /api/getpegawai` HTTP 200 dengan 97 row.
- **Test otomatis:** Menggunakan migration dan regression suite TASK-014 yang sebelumnya lulus 64/64 tanpa skip; `ensureSchema` development lulus dan backend kembali listen pada port 3000.
- **Verifikasi manual:** Dashboard browser perlu logout/login ulang agar JWT lama tidak menunjuk ID user sebelum restore, kemudian refresh halaman.
- **Risiko/catatan:** Dua akun lokal dipertahankan melalui schema staging. Token login lama harus dibuang setelah penggantian database. Tujuh belas presensi yatim belum dihapus atau diubah.
- **Rollback:** Backup sebelum penggantian tersedia di `C:\Users\HP\PostgreSQL\backups\catur_dev-before-old-dump-20260914-150000.dump` (4.950.093 byte).
- **Commit:** `docs: record local legacy database restore`.

### 2026-09-14 — TASK-014 — Kompatibilitas import database lama

- **Status:** Restore dan migration lokal lulus; import production menunggu PostgreSQL hosting aktif.
- **Ringkasan:** Memvalidasi `dump.sql` PostgreSQL 10 pada PostgreSQL 17, memperbaiki migration agar schema lama berbasis `VARCHAR` dapat dikonversi ke enum, dan menghubungkan presensi lama ke tujuan hasil backfill tanpa menghapus data yatim.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `.gitignore`, `backend/migrations/20260909-backfill-surat-tugas-tujuan.sql`, `backend/migrations/20260914-enforce-report-integrity.sql`, `backend/tests/integration/suratTugasTujuan.schema.test.js`, `backend/tests/integration/laporan.schema.test.js`, dan `CHANGELOG.md`.
- **File dihapus:** Tidak ada; `dump.sql` asli tidak dimodifikasi.
- **Class/fungsi/komponen diubah:** Tidak ada class runtime. Migration integritas sekarang membuat enum laporan bila belum ada, menolak nilai status asing, lalu mengonversi kolom `status`; migration backfill memetakan presensi hanya ketika tepat satu tujuan mencakup tanggalnya.
- **Database:** Restore uji berisi 102 user, 197 daerah, 97 surat tugas, 150 presensi, 34 laporan perjalanan, dan 215 notifikasi. Dibuat 97 child tujuan; 133 presensi valid berhasil dipetakan. Terdapat 17 presensi yatim dari data sumber yang tetap dipertahankan dan tidak dipetakan. Tidak ada pasangan laporan duplikat.
- **API:** Tidak ada perubahan endpoint atau response.
- **Test otomatis:** RED migration enum gagal dengan PostgreSQL error `42704`; GREEN compatibility test lulus. RED backfill menghasilkan relasi kosong; GREEN backfill test lulus. Seluruh backend lulus 64/64 tanpa skip pada hasil restore dump lama dan lint backend lulus 81 file.
- **Verifikasi manual:** Restore plain SQL selesai dengan exit 0 setelah metadata owner PostgreSQL 10 dibersihkan hanya pada salinan sementara. Migration multi-tujuan, backfill, enum, dan unique index berhasil pada `catur_test`.
- **Risiko/catatan:** Tujuh belas presensi yatim memerlukan keputusan bisnis terpisah karena surat induknya tidak tersedia. Dump dan file password cPanel ditambahkan ke `.gitignore`; tidak boleh masuk commit.
- **Rollback:** Backup sebelum restore tersedia di `C:\Users\HP\PostgreSQL\backups\catur_test-before-old-dump-20260914-144522.dump`. Restore production belum dilakukan, sehingga belum memerlukan rollback hosting.
- **Commit:** `fix: support legacy database import`.

### 2026-09-14 — TASK-013 — Regression, dokumentasi QA, dan kesiapan rilis

- **Status:** Implementasi dan verifikasi otomatis lokal selesai; QA manual, staging, serta backup production belum dijalankan.
- **Ringkasan:** Memperkuat regression flow dua surat agar operasi laporan akhir dan harian tidak tertukar, menutup seluruh endpoint surat dari pegawai yang bukan pemilik, memverifikasi batas deadline WITA, dan mengganti README boilerplate dengan panduan setup, QA, rollout, serta rollback.
- **File ditambahkan:** Tidak ada.
- **File diubah:** `backend/tests/integration/laporan.explicit-assignment.test.js`, `backend/tests/integration/laporan.edit-window.test.js`, `src/pages/pegawai/LaporanPegawai.test.jsx`, `README.md`, `CHANGELOG.md`, dan `docs/superpowers/plans/2026-09-14-perbaikan-laporan-per-surat-multi-tujuan-web.md`.
- **File dihapus:** Tidak ada.
- **Class/fungsi/komponen diubah:** Fixture `createFixture` mendukung catatan keuangan; regression test memverifikasi context route A/B, write laporan akhir/harian, authorization semua endpoint laporan, manifest nota, serta transisi deadline; tidak ada class runtime yang diubah.
- **Database:** Tidak ada perubahan schema atau data permanen pada Task 13. Backup database development lokal tersedia di `C:\Users\HP\PostgreSQL\backups\catur_dev-before-report-integrity-20260914-122647.dump` (4.949.025 byte) dan preflight pasangan laporan duplikat menghasilkan 0 baris. Backup serta migration production belum dijalankan.
- **API:** Tidak ada endpoint runtime baru. Test mengunci kontrak GET/POST/PUT/DELETE eksplisit berbasis `suratId`/`presensiId`, response 404 untuk bukan pemilik, isolasi manifest, dan response penguncian deadline.
- **Test otomatis:** Backend 62/62 lulus tanpa skip pada `catur_test`; backend lint lulus 81 file. Frontend 28/28 lulus, lint terarah file Task 13 lulus, dan build production lulus. Lint global masih gagal pada baseline lama: 690 masalah (681 error, 9 warning), termasuk konfigurasi root yang memindai CommonJS backend sebagai ESM dan pelanggaran lama React.
- **Verifikasi manual:** Checklist klik admin, pegawai, multi-tujuan, pergantian surat, upload, deadline, staging, dan production telah didokumentasikan di README tetapi belum dieksekusi pada browser di Task 13.
- **Risiko/catatan:** Gate otomatis untuk kode yang disentuh lulus. Release production belum boleh dinyatakan selesai sampai lint global dipisahkan/dibereskan, QA manual lulus, backup production dibuat, dan smoke test staging selesai.
- **Rollback:** Kembalikan aplikasi ke commit release sebelumnya; bila index perlu dilepas gunakan `DROP INDEX IF EXISTS uq_laporan_perjalanan_surat_pegawai;`; pertahankan enum `draft`; restore dump hanya bila migration atau verifikasi data gagal.
- **Commit:** `test: verify report selection and deadline flow`.

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
