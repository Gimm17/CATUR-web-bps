# Perbaikan Laporan Per Surat dan Multi-Tujuan Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memastikan seluruh progres dan operasi laporan web terikat pada surat tugas yang dipilih, mendukung satu laporan untuk beberapa tujuan, mempertahankan riwayat, dan menerapkan masa edit tujuh hari berdasarkan WITA.

**Architecture:** Backend menyediakan report context yang memvalidasi kepemilikan `surat_tugas_id`, menghitung deadline secara terpusat, dan digunakan oleh semua endpoint read/write. Frontend memakai rute `/laporan/:suratId` sebagai satu-satunya halaman progres/edit, sedangkan halaman riwayat berfungsi sebagai pemilih record. Endpoint tanpa ID dipertahankan sementara untuk mobile, tetapi tidak boleh fallback ke record terbaru.

**Tech Stack:** React 19, React Router 7, Axios, Vitest, Testing Library, Node.js 24, Express 5, Sequelize 6, PostgreSQL 17, Node test runner, JWT, WITA (`Asia/Makassar`).

**Spec:** `docs/superpowers/specs/2026-09-14-perbaikan-laporan-per-surat-web.md`

## Global Constraints

- Implementasi fase ini hanya untuk web; jangan mengubah source Flutter.
- Gunakan `surat_tugas_id` eksplisit untuk seluruh operasi laporan web.
- Backend wajib memvalidasi kepemilikan record dan menjadi otoritas izin edit.
- Tanggal bisnis menggunakan `Asia/Makassar`.
- Deadline adalah tujuh hari kalender setelah tanggal selesai tujuan terakhir, inklusif sampai pukul 23:59:59 WITA.
- Satu pasangan `(surat_tugas_id, pegawai_id)` hanya boleh memiliki satu laporan akhir.
- Endpoint legacy tetap aktif sampai mobile dimigrasikan, tetapi tidak boleh fallback ke surat terbaru.
- Jangan commit `.env`, credential Google, uploads, dump database, atau token.
- Terapkan TDD: test gagal, implementasi minimum, test lulus, refactor.
- Setiap task wajib memperbarui `CHANGELOG.md` sebelum commit.
- Setiap commit hanya memuat perubahan task tersebut beserta record changelog-nya.
- Uji lokal dan staging sebelum production; selalu buat backup database sebelum migration production.

---

## Peta Struktur File

### File baru

| File | Tanggung jawab |
|---|---|
| `backend/src/services/reportWindow.service.js` | Menghitung akhir perjalanan, deadline, sisa hari, dan izin edit |
| `backend/src/services/reportContext.service.js` | Memuat surat milik pengguna beserta tujuan dan report window |
| `backend/src/middlewares/reportContext.middleware.js` | Memasang report context tervalidasi ke request |
| `backend/migrations/20260914-enforce-report-integrity.sql` | Menambahkan enum `draft` dan unique index laporan |
| `backend/tests/unit/reportWindow.service.test.js` | Unit test aturan tujuh hari dan status lock |
| `backend/tests/integration/laporan.explicit-assignment.test.js` | Integration test isolasi Surat A dan Surat B |
| `backend/tests/integration/laporan.edit-window.test.js` | Integration test deadline dan status lock |
| `backend/tests/integration/laporan.schema.test.js` | Integration test enum dan unique index |
| `src/pages/pegawai/LaporanEntry.jsx` | Resolver aman untuk akses menu laporan tanpa ID |
| `src/features/laporan/reportWindow.js` | Formatter/presenter deadline dari response backend |
| `src/features/laporan/reportWindow.test.js` | Unit test presenter deadline |
| `src/pages/pegawai/LaporanPegawai.test.jsx` | Test halaman selalu memakai ID dari route |
| `src/pages/pegawai/ReportLaporanPegawai.test.jsx` | Test tombol riwayat meneruskan ID |

### File yang dimodifikasi

| File | Perubahan |
|---|---|
| `backend/src/utils/businessDate.js` | Tambah perbandingan dan selisih tanggal kalender bisnis |
| `backend/src/models/laporan.perjalanan.js` | Sinkronkan enum `draft` dan deklarasikan unique index |
| `backend/src/controllers/laporan.controller.js` | Hilangkan pemilihan latest record dari flow eksplisit |
| `backend/src/controllers/presensi.controller.js` | Terapkan report window pada edit laporan harian |
| `backend/src/routes/laporan.route.js` | Tambah seluruh endpoint berbasis `:suratId` |
| `backend/src/routes/presensi.routes.js` | Tambah endpoint laporan harian berbasis `:presensiId` |
| `backend/src/services/activeAssignment.service.js` | Sediakan resolver legacy tanpa fallback latest |
| `backend/src/controllers/suratTugas.controller.js` | Pastikan detail progres menyertakan semua tujuan terurut |
| `backend/src/utils/ensureSchema.js` | Validasi schema baru saat startup tanpa destructive sync |
| `src/services/laporan.service.js` | Semua operasi menerima `suratId` wajib |
| `src/services/presensiService.js` | Edit laporan harian menerima `presensiId` di URL |
| `src/App.jsx` | Tambah route progres berbasis ID dan entry resolver |
| `src/fragments/Sidebar.pegawai.jsx` | Arahkan menu riwayat ke pemilih surat |
| `src/pages/pegawai/Dashboard.jsx` | Tombol laporan meneruskan ID yang dipilih |
| `src/pages/pegawai/ReportLaporanPegawai.jsx` | Tambah aksi detail per surat dan tujuan lengkap |
| `src/pages/pegawai/LaporanPegawai.jsx` | Muat/edit seluruh data berdasarkan route ID |
| `src/pages/pegawai/LaporanBySurat.jsx` | Ubah menjadi redirect kompatibilitas atau hapus dari route aktif |
| `CHANGELOG.md` | Tambah satu record pada setiap task |

### Perubahan database target

- Tidak menambah atau menghapus tabel.
- Menggunakan tabel yang sudah ada: `surat_tugas`, `surat_tugas_tujuan`, `presensi`, `laporan_perjalanan`, dan `users`.
- Menambah nilai enum `draft` pada `enum_laporan_perjalanan_status` karena controller saat ini membuat draft tetapi enum PostgreSQL dan model belum mendeklarasikannya.
- Menambah unique index `uq_laporan_perjalanan_surat_pegawai` pada `laporan_perjalanan(surat_tugas_id, pegawai_id)`.
- Deadline tidak disimpan sebagai kolom; deadline diturunkan dari tanggal selesai tujuan terakhir agar tidak stale ketika jadwal surat diperbarui.
- Tidak menghapus data secara otomatis. Duplicate laporan harus dilaporkan dan diselesaikan secara eksplisit sebelum unique index dibuat.

---

## Traceability Requirement ke Task

| Requirement | Task |
|---|---|
| Detail/progres mengikuti surat yang dipilih | 3, 4, 7, 8, 9, 10 |
| Tidak fallback ke record terbaru | 4, 8, 13 |
| Riwayat lama tetap terlihat dan dapat dibuka | 8, 9, 13 |
| Semua write terikat pada surat terpilih | 3, 5, 7, 10, 13 |
| Kepemilikan dan isolasi antarpegawai | 3, 4, 5, 6, 13 |
| Satu laporan akhir per surat dan pegawai | 2, 5, 13 |
| Deadline tujuh hari kalender WITA | 1, 6, 11, 13 |
| Edit `draft`/`dikirim` dan lock proses keuangan | 1, 6, 11, 13 |
| Satu surat memiliki beberapa tujuan | 12, 13 |
| Tujuan aktif mengikuti tanggal WITA | 1, 4, 12, 13 |
| Durasi presensi mengikuti jadwal tujuan | 12, 13 |
| Backward compatibility mobile | 4, 6, 8, 13 |
| Migration aman, rollout, dan rollback | 2, 13 |
| Changelog diperbarui setiap task | 1–13 |

---

### Task 1: Utilitas Tanggal WITA dan Report Window

**Files:**
- Modify: `backend/src/utils/businessDate.js`
- Create: `backend/src/services/reportWindow.service.js`
- Create: `backend/tests/unit/reportWindow.service.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `getBusinessDate(now)`, `addBusinessDays(date, days)`, dan array tujuan terurut.
- Produces: `getLastDestinationEndDate({ tujuan, fallbackEndDate })`, `buildReportWindow({ tujuan, fallbackEndDate, status, now })`, `assertReportEditable(reportWindow)`, dan object `{ timezone, trip_end_date, deadline_date, editable, remaining_days, lock_reason }`.

- [x] **Step 1: Tulis test tanggal akhir dan deadline tujuh hari**

```js
test('deadline tujuh hari dihitung dari tujuan terakhir', () => {
  const result = buildReportWindow({
    tujuan: [
      { tanggal_selesai: '2026-09-16' },
      { tanggal_selesai: '2026-09-19' },
    ],
    status: 'draft',
    now: new Date('2026-09-20T00:00:00+08:00'),
  });
  assert.equal(result.trip_end_date, '2026-09-19');
  assert.equal(result.deadline_date, '2026-09-26');
  assert.equal(result.editable, true);
});
```

- [x] **Step 2: Tulis test boundary WITA, lewat deadline, dan status terkunci**

```js
test('dicek_keuangan terkunci walau deadline belum lewat', () => {
  const result = buildReportWindow({
    tujuan: [{ tanggal_selesai: '2026-09-19' }],
    status: 'dicek_keuangan',
    now: new Date('2026-09-20T08:00:00+08:00'),
  });
  assert.equal(result.editable, false);
  assert.equal(result.lock_reason, 'finance_processing');
});
```

- [x] **Step 3: Jalankan unit test dan pastikan gagal karena service belum ada**

Run: `cd backend && node --test tests/unit/reportWindow.service.test.js`  
Expected: FAIL dengan module `reportWindow.service` belum ditemukan.

- [x] **Step 4: Tambahkan helper selisih tanggal pada `businessDate.js`**

```js
function differenceInBusinessDates(from, to) {
  const start = parseBusinessDate(from);
  const end = parseBusinessDate(to);
  return Math.floor((end - start) / 86400000);
}
```

- [x] **Step 5: Implementasikan `reportWindow.service.js` dengan status lock eksplisit**

```js
const LOCKED_STATUSES = new Set([
  'dicek_keuangan',
  'disetujui_keuangan',
  'ditandatangani',
  'pencairan_dana',
  'dana_turun',
]);

function assertReportEditable(reportWindow) {
  if (reportWindow.editable) return;
  const error = new Error(
    reportWindow.lock_reason === 'deadline_passed'
      ? 'Batas penyelesaian laporan telah berakhir.'
      : 'Laporan sudah masuk proses keuangan.'
  );
  error.status = 409;
  error.code = reportWindow.lock_reason === 'deadline_passed'
    ? 'REPORT_DEADLINE_PASSED'
    : 'REPORT_LOCKED_BY_STATUS';
  error.reportWindow = reportWindow;
  throw error;
}
```

- [x] **Step 6: Jalankan unit test sampai seluruh boundary lulus**

Run: `cd backend && node --test tests/unit/reportWindow.service.test.js`  
Expected: PASS untuk akhir perjalanan, hari deadline, lewat deadline, `draft`, `dikirim`, dan seluruh status lock.

- [x] **Step 7: Tambahkan record Task 1 ke `CHANGELOG.md`**

Record wajib mencantumkan dua file kode, satu file test, fungsi baru, tidak ada perubahan DB/API, hasil test, risiko timezone, dan rollback.

- [x] **Step 8: Commit Task 1**

```bash
git add backend/src/utils/businessDate.js backend/src/services/reportWindow.service.js backend/tests/unit/reportWindow.service.test.js CHANGELOG.md
git commit -m "feat: add WITA report edit window"
```

### Task 2: Integritas Schema Laporan

**Files:**
- Create: `backend/migrations/20260914-enforce-report-integrity.sql`
- Modify: `backend/src/models/laporan.perjalanan.js`
- Modify: `backend/src/utils/ensureSchema.js`
- Create: `backend/tests/integration/laporan.schema.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: tabel `laporan_perjalanan` dan enum `enum_laporan_perjalanan_status`.
- Produces: enum yang menerima `draft` dan unique index `uq_laporan_perjalanan_surat_pegawai`.

- [x] **Step 1: Tulis integration test bahwa status `draft` dapat disimpan**

```js
test('laporan menerima status draft', async () => {
  const row = await LaporanPerjalanan.create({
    surat_tugas_id: fixture.suratId,
    pegawai_id: fixture.userId,
    status: 'draft',
  });
  assert.equal(row.status, 'draft');
});
```

- [x] **Step 2: Tulis integration test bahwa laporan kedua ditolak**

```js
await assert.rejects(
  () => LaporanPerjalanan.create({
    surat_tugas_id: fixture.suratId,
    pegawai_id: fixture.userId,
    status: 'draft',
  }),
  /uq_laporan_perjalanan_surat_pegawai|unique/i
);
```

- [x] **Step 3: Jalankan test schema dan verifikasi gagal pada enum/index**

Run: `cd backend && node --test tests/integration/laporan.schema.test.js`  
Expected: FAIL karena enum belum mempunyai `draft` atau duplicate belum dibatasi.

- [x] **Step 4: Tambahkan preflight duplicate dan migration non-destruktif**

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM laporan_perjalanan
    GROUP BY surat_tugas_id, pegawai_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate laporan_perjalanan harus diselesaikan sebelum migration';
  END IF;
END $$;

ALTER TYPE enum_laporan_perjalanan_status ADD VALUE IF NOT EXISTS 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS uq_laporan_perjalanan_surat_pegawai
  ON laporan_perjalanan (surat_tugas_id, pegawai_id);
```

- [x] **Step 5: Sinkronkan model Sequelize dan startup schema check**

Tambahkan `'draft'` sebagai nilai pertama enum model dan validasi keberadaan index melalui query katalog; jangan gunakan `sequelize.sync({ alter: true })` di production.

- [x] **Step 6: Jalankan migration pada `catur_test`, lalu jalankan test schema**

Run: `psql -d catur_test -v ON_ERROR_STOP=1 -f backend/migrations/20260914-enforce-report-integrity.sql`  
Run: `cd backend && node --test tests/integration/laporan.schema.test.js`  
Expected: migration sukses dan seluruh test PASS.

- [x] **Step 7: Catat perubahan enum/index dan hasil preflight di `CHANGELOG.md`**

Catat bahwa tidak ada tabel/kolom yang ditambah atau dihapus serta rollback index: `DROP INDEX IF EXISTS uq_laporan_perjalanan_surat_pegawai;`.

- [x] **Step 8: Commit Task 2**

```bash
git add backend/migrations/20260914-enforce-report-integrity.sql backend/src/models/laporan.perjalanan.js backend/src/utils/ensureSchema.js backend/tests/integration/laporan.schema.test.js CHANGELOG.md
git commit -m "fix: enforce report record integrity"
```

### Task 3: Report Context dan Validasi Kepemilikan

**Files:**
- Create: `backend/src/services/reportContext.service.js`
- Create: `backend/src/middlewares/reportContext.middleware.js`
- Create: `backend/tests/unit/reportContext.service.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `SuratTugas`, association `tujuan`, `buildReportWindow`, `req.user.id`, dan `req.params.suratId`.
- Produces: `getOwnedReportContext({ suratId, userId, now })` dan middleware `loadOwnedReportContext` yang mengisi `req.reportContext`.

- [x] **Step 1: Tulis test ID wajib, surat tidak ditemukan, dan surat milik orang lain**

```js
await assert.rejects(
  () => getOwnedReportContext({ suratId: 88, userId: 10 }),
  (error) => error.status === 404 && error.code === 'SURAT_NOT_FOUND'
);
```

- [x] **Step 2: Tulis test context memuat tujuan terurut dan report window**

```js
assert.deepEqual(context.surat.tujuan.map((item) => item.urutan), [1, 2]);
assert.equal(context.reportWindow.deadline_date, '2026-09-26');
```

- [x] **Step 3: Jalankan test dan pastikan gagal karena service belum ada**

Run: `cd backend && node --test tests/unit/reportContext.service.test.js`  
Expected: FAIL dengan module belum ditemukan.

- [x] **Step 4: Implementasikan query kepemilikan dalam satu operasi**

```js
const surat = await SuratTugas.findOne({
  where: { id: suratId, user_id: userId },
  include: [{ model: SuratTugasTujuan, as: 'tujuan', separate: true, order: [['urutan', 'ASC']] }],
});
```

- [x] **Step 5: Implementasikan middleware dan mapping error aman**

```js
async function loadOwnedReportContext(req, res, next) {
  try {
    req.reportContext = await getOwnedReportContext({
      suratId: req.params.suratId,
      userId: req.user.id,
    });
    next();
  } catch (error) {
    res.status(error.status || 500).json({ code: error.code, message: error.message });
  }
}
```

- [x] **Step 6: Jalankan unit test dan lint backend**

Run: `cd backend && node --test tests/unit/reportContext.service.test.js && npm run lint`  
Expected: PASS dan exit code 0.

- [x] **Step 7: Catat service, middleware, simbol, dan security rule di `CHANGELOG.md`**

Catat bahwa akses lintas pegawai menghasilkan `404` dan tidak membocorkan record.

- [x] **Step 8: Commit Task 3**

```bash
git add backend/src/services/reportContext.service.js backend/src/middlewares/reportContext.middleware.js backend/tests/unit/reportContext.service.test.js CHANGELOG.md
git commit -m "feat: add owned report context"
```

### Task 4: Endpoint Read Progres Berdasarkan Surat ID

**Files:**
- Modify: `backend/src/controllers/laporan.controller.js`
- Modify: `backend/src/routes/laporan.route.js`
- Modify: `backend/src/services/activeAssignment.service.js`
- Create: `backend/tests/integration/laporan.explicit-assignment.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `req.reportContext` dari Task 3.
- Produces: `GET /api/perjalanan/surat/:suratId` dengan `report_window`; resolver legacy hanya menerima satu surat aktif hari ini.

- [x] **Step 1: Buat fixture dua surat untuk satu pegawai**

```js
const suratA = await createSurat({ userId, nomor: 'A', start: '2026-09-14', end: '2026-09-16' });
const suratB = await createSurat({ userId, nomor: 'B', start: '2026-09-17', end: '2026-09-19' });
```

- [x] **Step 2: Tulis test GET A dan GET B tidak tertukar**

```js
assert.equal(responseA.body.surat_tugas.id, suratA.id);
assert.equal(responseB.body.surat_tugas.id, suratB.id);
assert.notEqual(responseA.body.surat_tugas.id, responseB.body.surat_tugas.id);
```

- [x] **Step 3: Tulis test endpoint legacy tidak fallback ke latest**

```js
assert.equal(noActiveResponse.status, 404);
assert.equal(noActiveResponse.body.code, 'NO_ACTIVE_ASSIGNMENT');
```

- [x] **Step 4: Jalankan integration test dan verifikasi kegagalan flow lama**

Run: `cd backend && node --test tests/integration/laporan.explicit-assignment.test.js`  
Expected: FAIL karena endpoint eksplisit belum terdaftar atau endpoint lama memilih latest.

- [x] **Step 5: Ekstrak builder response dari controller**

```js
async function buildPerjalananResponse({ userId, surat, reportWindow }) {
  return {
    user,
    surat_tugas: surat,
    tujuan: surat.tujuan || [],
    presensi,
    laporan_akhir: laporanAkhir,
    pembayaran,
    bukti_pembayaran: readBuktiManifest(userId, surat.id),
    report_window: reportWindow,
  };
}
```

- [x] **Step 6: Daftarkan route eksplisit sebelum route legacy**

```js
router.get('/perjalanan/surat/:suratId', auth, loadOwnedReportContext, laporanController.getLaporanPerjalananBySuratId);
```

- [x] **Step 7: Ubah resolver legacy agar hanya memakai active assignment WITA**

Hapus fallback `order: [['created_at', 'DESC']]`; kembalikan `NO_ACTIVE_ASSIGNMENT` bila tidak ada tujuan aktif.

- [x] **Step 8: Jalankan integration test, backend suite, dan lint**

Run: `cd backend && node --test tests/integration/laporan.explicit-assignment.test.js && npm test && npm run lint`  
Expected: seluruh test PASS dan lint exit 0.

- [x] **Step 9: Tambahkan record Task 4 ke `CHANGELOG.md`**

Catat endpoint baru, helper controller, perubahan resolver legacy, file test, dan rollback route.

- [x] **Step 10: Commit Task 4**

```bash
git add backend/src/controllers/laporan.controller.js backend/src/routes/laporan.route.js backend/src/services/activeAssignment.service.js backend/tests/integration/laporan.explicit-assignment.test.js CHANGELOG.md
git commit -m "fix: load report progress by assignment id"
```

### Task 5: Endpoint Write TTD, Nota, dan Kirim Berdasarkan Surat ID

**Files:**
- Modify: `backend/src/controllers/laporan.controller.js`
- Modify: `backend/src/routes/laporan.route.js`
- Modify: `backend/tests/integration/laporan.explicit-assignment.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `req.reportContext`, `reportWindow.editable`, dan unique index Task 2.
- Produces: enam endpoint upload/read/reset/kirim berbasis `:suratId` yang selalu mengubah report context terpilih.

- [ ] **Step 1: Tulis test kirim laporan Surat A tidak mengubah Surat B**

```js
assert.equal(savedA.surat_tugas_id, suratA.id);
assert.equal(await countReports(suratB.id, userId), 0);
```

- [ ] **Step 2: Tulis test TTD dan manifest nota terisolasi per surat**

```js
assert.equal(readBuktiManifest(userId, suratA.id).length, 1);
assert.equal(readBuktiManifest(userId, suratB.id).length, 0);
```

- [ ] **Step 3: Tulis test body ID yang bertentangan ditolak**

```js
assert.equal(conflictResponse.status, 400);
assert.equal(conflictResponse.body.code, 'SURAT_ID_MISMATCH');
```

- [ ] **Step 4: Jalankan test dan verifikasi gagal pada endpoint write baru**

Run: `cd backend && node --test tests/integration/laporan.explicit-assignment.test.js`  
Expected: FAIL pada endpoint kirim/TTD/nota berbasis ID.

- [ ] **Step 5: Refactor controller untuk menggunakan context yang sudah divalidasi**

```js
const { surat, reportWindow } = req.reportContext;
assertReportEditable(reportWindow);
```

- [ ] **Step 6: Daftarkan route write eksplisit**

```js
router.post('/perjalanan/surat/:suratId/kirim', auth, loadOwnedReportContext, laporanController.kirimLaporanAkhir);
router.post('/perjalanan/surat/:suratId/ttd-pegawai', auth, loadOwnedReportContext, uploadTTDMiddleware.single('ttd_pegawai'), uploadToDrive, laporanController.uploadTTDPegawai);
router.get('/perjalanan/surat/:suratId/ttd-pegawai', auth, loadOwnedReportContext, laporanController.getTTDPegawai);
```

- [ ] **Step 7: Daftarkan tiga route bukti pembayaran berbasis ID**

Gunakan prefix `/perjalanan/surat/:suratId/bukti-pembayaran` untuk `POST`, `GET`, dan `DELETE`, dengan `loadOwnedReportContext` sebelum middleware upload.

- [ ] **Step 8: Pastikan pengiriman ulang melakukan update record yang sama**

Gunakan `findOne({ where: { surat_tugas_id: surat.id, pegawai_id: userId } })`; tangani unique violation sebagai `409 REPORT_ALREADY_EXISTS`, bukan membuat duplikat.

- [ ] **Step 9: Jalankan integration test dan backend suite**

Run: `cd backend && node --test tests/integration/laporan.explicit-assignment.test.js && npm test`  
Expected: operasi A/B terisolasi dan seluruh test PASS.

- [ ] **Step 10: Update `CHANGELOG.md` dan commit Task 5**

```bash
git add backend/src/controllers/laporan.controller.js backend/src/routes/laporan.route.js backend/tests/integration/laporan.explicit-assignment.test.js CHANGELOG.md
git commit -m "fix: scope report writes to assignment id"
```

### Task 6: Enforcement Deadline pada Laporan Harian dan Akhir

**Files:**
- Modify: `backend/src/controllers/presensi.controller.js`
- Modify: `backend/src/routes/presensi.routes.js`
- Modify: `backend/src/controllers/laporan.controller.js`
- Create: `backend/tests/integration/laporan.edit-window.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `getOwnedReportContext`, `buildReportWindow`, dan `presensi.surat_tugas_id`.
- Produces: `PUT /api/presensi/:presensiId/laporan` dan error `REPORT_DEADLINE_PASSED`/`REPORT_LOCKED_BY_STATUS`.

- [ ] **Step 1: Tulis test edit pada hari terakhir deadline berhasil**

```js
assert.equal(onDeadlineResponse.status, 200);
assert.match(onDeadlineResponse.body.data.laporan, /hasil kegiatan/i);
```

- [ ] **Step 2: Tulis test edit satu hari setelah deadline ditolak**

```js
assert.equal(afterDeadlineResponse.status, 409);
assert.equal(afterDeadlineResponse.body.code, 'REPORT_DEADLINE_PASSED');
```

- [ ] **Step 3: Tulis test status keuangan mengunci edit**

```js
assert.equal(financeLockedResponse.status, 409);
assert.equal(financeLockedResponse.body.code, 'REPORT_LOCKED_BY_STATUS');
```

- [ ] **Step 4: Jalankan test dan verifikasi controller lama masih mengizinkan edit**

Run: `cd backend && node --test tests/integration/laporan.edit-window.test.js`  
Expected: FAIL untuk deadline dan status lock.

- [ ] **Step 5: Ubah route laporan harian menggunakan ID URL**

```js
router.put('/:presensiId/laporan', authMiddleware, presensiController.updateLaporan);
```

- [ ] **Step 6: Muat presensi milik user lalu validasi report window suratnya**

```js
const presensi = await Presensi.findOne({
  where: { id: req.params.presensiId, user_id: req.user.id },
});
const context = await getOwnedReportContext({
  suratId: presensi.surat_tugas_id,
  userId: req.user.id,
});
assertReportEditable(context.reportWindow);
```

- [ ] **Step 7: Terapkan guard yang sama sebelum TTD, nota, dan kirim laporan akhir**

Semua response lock mengembalikan `report_window` agar frontend dapat menunjukkan alasan dan deadline yang benar.

- [ ] **Step 8: Pertahankan route `/presensi/laporan` sebagai adapter legacy**

Adapter membaca `presensi_id`, lalu memanggil handler yang sama; tandai response header `Deprecation: true` tanpa mengubah kontrak mobile.

- [ ] **Step 9: Jalankan integration test, backend suite, dan lint**

Run: `cd backend && node --test tests/integration/laporan.edit-window.test.js && npm test && npm run lint`  
Expected: seluruh test PASS.

- [ ] **Step 10: Update `CHANGELOG.md` dan commit Task 6**

```bash
git add backend/src/controllers/presensi.controller.js backend/src/routes/presensi.routes.js backend/src/controllers/laporan.controller.js backend/tests/integration/laporan.edit-window.test.js CHANGELOG.md
git commit -m "feat: enforce report editing deadline"
```

### Task 7: Kontrak Service Frontend Berbasis Surat ID

**Files:**
- Modify: `src/services/laporan.service.js`
- Modify: `src/services/presensiService.js`
- Create: `src/services/laporan.service.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: endpoint eksplisit Tasks 4–6.
- Produces: `getLaporanPerjalanan(suratId)`, `kirimLaporanAkhir(suratId, payload)`, `uploadTTD(suratId, formData)`, `getTTD(suratId)`, `uploadBuktiPembayaran(suratId, formData)`, `getBuktiPembayaran(suratId)`, `resetBuktiPembayaran(suratId)`, dan `submitLaporan(presensiId, laporan)`.

- [ ] **Step 1: Tulis test service GET membangun URL dari ID**

```js
expect(axios.get).toHaveBeenCalledWith('/perjalanan/surat/41');
```

- [ ] **Step 2: Tulis test seluruh service write memakai ID yang sama**

```js
expect(axios.post).toHaveBeenCalledWith('/perjalanan/surat/41/kirim', payload);
expect(axios.delete).toHaveBeenCalledWith('/perjalanan/surat/41/bukti-pembayaran');
```

- [ ] **Step 3: Tulis test ID kosong ditolak sebelum request**

```js
await expect(getLaporanPerjalanan()).rejects.toThrow('suratId wajib diisi');
```

- [ ] **Step 4: Jalankan Vitest dan pastikan kontrak lama gagal**

Run: `npm test -- src/services/laporan.service.test.js`  
Expected: FAIL karena service lama menggunakan endpoint generik.

- [ ] **Step 5: Tambahkan validator ID tunggal**

```js
function requireSuratId(suratId) {
  const value = String(suratId || '').trim();
  if (!/^\d+$/.test(value)) throw new Error('suratId wajib diisi');
  return value;
}
```

- [ ] **Step 6: Ubah seluruh fungsi service ke endpoint berbasis ID**

Jangan mengirim `surat_tugas_id` ganda di body; URL adalah sumber ID. Pertahankan token melalui interceptor `src/api/axios.js`.

- [ ] **Step 7: Ubah `submitLaporan` ke URL presensi eksplisit**

```js
export const submitLaporan = (presensiId, laporan) =>
  axios.put(`/presensi/${presensiId}/laporan`, { laporan });
```

- [ ] **Step 8: Jalankan test service dan lint frontend**

Run: `npm test -- src/services/laporan.service.test.js && npm run lint`  
Expected: PASS dan lint exit 0.

- [ ] **Step 9: Update `CHANGELOG.md` dan commit Task 7**

```bash
git add src/services/laporan.service.js src/services/presensiService.js src/services/laporan.service.test.js CHANGELOG.md
git commit -m "refactor: require assignment id in report services"
```

### Task 8: Routing Laporan yang Aman

**Files:**
- Create: `src/pages/pegawai/LaporanEntry.jsx`
- Modify: `src/App.jsx`
- Modify: `src/fragments/Sidebar.pegawai.jsx`
- Modify: `src/pages/pegawai/LaporanBySurat.jsx`
- Create: `src/pages/pegawai/LaporanEntry.test.jsx`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `getSuratTugasAktif()` dan route hasil Task 7.
- Produces: `/laporan/:suratId` untuk detail, `/laporan` sebagai resolver aman, dan `/laporan-report` sebagai pemilih riwayat.

- [ ] **Step 1: Tulis test `/laporan` mengarahkan satu surat aktif ke ID**

```jsx
expect(await screen.findByTestId('location')).toHaveTextContent('/laporan/41');
```

- [ ] **Step 2: Tulis test tanpa surat aktif mengarahkan ke riwayat**

```jsx
expect(await screen.findByTestId('location')).toHaveTextContent('/laporan-report');
```

- [ ] **Step 3: Jalankan test dan pastikan gagal karena entry resolver belum ada**

Run: `npm test -- src/pages/pegawai/LaporanEntry.test.jsx`  
Expected: FAIL dengan component belum ditemukan.

- [ ] **Step 4: Implementasikan `LaporanEntry` tanpa fallback latest**

```jsx
if (active?.id) return <Navigate to={`/laporan/${active.id}`} replace />;
return <Navigate to="/laporan-report" replace />;
```

- [ ] **Step 5: Daftarkan route terlindungi**

```jsx
<Route path="/laporan" element={<ProtectedRoute allowedRoles={['pegawai']}><LaporanEntry /></ProtectedRoute>} />
<Route path="/laporan/:suratId" element={<ProtectedRoute allowedRoles={['pegawai']}><LaporanPegawai /></ProtectedRoute>} />
```

- [ ] **Step 6: Arahkan menu sidebar ke `/laporan-report`**

Label menu menjadi `Riwayat Laporan`; progress surat aktif tetap dibuka dari dashboard menggunakan ID.

- [ ] **Step 7: Jadikan `/laporan-surat/:id` redirect kompatibilitas**

`LaporanBySurat` tidak lagi menjalankan flow edit terpisah; redirect ke `/laporan/{id}` agar hanya ada satu halaman progres utama.

- [ ] **Step 8: Jalankan test routing, seluruh frontend test, dan lint**

Run: `npm test -- src/pages/pegawai/LaporanEntry.test.jsx && npm test && npm run lint`  
Expected: seluruh test PASS.

- [ ] **Step 9: Update `CHANGELOG.md` dan commit Task 8**

```bash
git add src/pages/pegawai/LaporanEntry.jsx src/pages/pegawai/LaporanEntry.test.jsx src/App.jsx src/fragments/Sidebar.pegawai.jsx src/pages/pegawai/LaporanBySurat.jsx CHANGELOG.md
git commit -m "fix: route reports by selected assignment"
```

### Task 9: Dashboard dan Riwayat Memilih Record Berdasarkan ID

**Files:**
- Modify: `src/pages/pegawai/Dashboard.jsx`
- Modify: `src/pages/pegawai/ReportLaporanPegawai.jsx`
- Create: `src/pages/pegawai/ReportLaporanPegawai.test.jsx`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: route `/laporan/:suratId`.
- Produces: tombol `Lihat Detail`, `Lanjutkan`, atau `Lihat Laporan` yang selalu membawa `row.surat.id`.

- [ ] **Step 1: Tulis test dua baris riwayat memiliki target berbeda**

```jsx
expect(screen.getByRole('link', { name: /surat a/i })).toHaveAttribute('href', '/laporan/11');
expect(screen.getByRole('link', { name: /surat b/i })).toHaveAttribute('href', '/laporan/22');
```

- [ ] **Step 2: Tulis test surat tanpa laporan tetap mempunyai tombol `Lanjutkan`**

```jsx
expect(screen.getByRole('link', { name: /lanjutkan surat a/i })).toBeVisible();
```

- [ ] **Step 3: Jalankan test dan pastikan tabel lama gagal karena tidak memiliki aksi**

Run: `npm test -- src/pages/pegawai/ReportLaporanPegawai.test.jsx`  
Expected: FAIL karena link detail belum ada.

- [ ] **Step 4: Ganti `window.location.href = '/laporan'` pada dashboard**

```js
const handleLaporanClick = (surat) => navigate(`/laporan/${surat.id}`);
```

- [ ] **Step 5: Tambahkan kolom aksi pada tabel riwayat**

Setiap tombol harus memiliki accessible name yang menyertakan nomor surat dan target `/laporan/${row.surat.id}`.

- [ ] **Step 6: Pertahankan semua record dan pagination**

Gunakan key `surat-${row.surat.id}` untuk baris tanpa laporan dan `laporan-${row.laporan.id}` untuk baris dengan laporan; jangan memakai index sebagai identitas utama.

- [ ] **Step 7: Jalankan test halaman, seluruh frontend test, dan lint**

Run: `npm test -- src/pages/pegawai/ReportLaporanPegawai.test.jsx && npm test && npm run lint`  
Expected: dua surat menuju URL berbeda dan seluruh test PASS.

- [ ] **Step 8: Update `CHANGELOG.md` dan commit Task 9**

```bash
git add src/pages/pegawai/Dashboard.jsx src/pages/pegawai/ReportLaporanPegawai.jsx src/pages/pegawai/ReportLaporanPegawai.test.jsx CHANGELOG.md
git commit -m "fix: open selected report from dashboard history"
```

### Task 10: Halaman Progres dan Seluruh Aksi Menggunakan Route ID

**Files:**
- Modify: `src/pages/pegawai/LaporanPegawai.jsx`
- Create: `src/pages/pegawai/LaporanPegawai.test.jsx`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: semua fungsi service Task 7 dan parameter `suratId`.
- Produces: halaman progres tunggal yang tidak dapat berganti context secara diam-diam.

- [ ] **Step 1: Tulis test mount `/laporan/11` memanggil service dengan `11`**

```jsx
expect(getLaporanPerjalanan).toHaveBeenCalledWith('11');
```

- [ ] **Step 2: Tulis test upload, reset, edit harian, dan kirim memakai ID yang sama**

```jsx
expect(uploadTTD).toHaveBeenCalledWith('11', expect.any(FormData));
expect(kirimLaporanAkhir).toHaveBeenCalledWith('11', expect.any(Object));
expect(submitLaporan).toHaveBeenCalledWith(presensiId, expect.any(String));
```

- [ ] **Step 3: Tulis test mengganti URL 11 ke 22 memuat ulang context**

```jsx
expect(getLaporanPerjalanan).toHaveBeenNthCalledWith(1, '11');
expect(getLaporanPerjalanan).toHaveBeenNthCalledWith(2, '22');
```

- [ ] **Step 4: Jalankan test dan verifikasi gagal karena halaman masih memakai endpoint generik**

Run: `npm test -- src/pages/pegawai/LaporanPegawai.test.jsx`  
Expected: FAIL pada argumen service.

- [ ] **Step 5: Ambil ID dari `useParams()` dan jadikan dependency fetch**

```jsx
const { suratId } = useParams();
useEffect(() => {
  fetchData(suratId);
}, [suratId]);
```

- [ ] **Step 6: Teruskan ID ke seluruh handler**

TTD, nota, reset, get TTD, get nota, dan kirim laporan memanggil service dengan `suratId`; edit harian memakai `editPresensi.id`.

- [ ] **Step 7: Reset state ketika ID route berubah**

Kosongkan `data`, preview TTD, daftar nota, modal edit, error, dan active stage sebelum fetch context baru agar data surat sebelumnya tidak berkedip pada surat baru.

- [ ] **Step 8: Tangani response `404` dan `409` secara spesifik**

`404` menampilkan `Surat tugas tidak ditemukan atau bukan milik Anda`; `REPORT_DEADLINE_PASSED` dan `REPORT_LOCKED_BY_STATUS` menampilkan alasan dari `report_window`.

- [ ] **Step 9: Jalankan test halaman, test suite, lint, dan build**

Run: `npm test -- src/pages/pegawai/LaporanPegawai.test.jsx && npm test && npm run lint && npm run build`  
Expected: seluruh command exit 0.

- [ ] **Step 10: Update `CHANGELOG.md` dan commit Task 10**

```bash
git add src/pages/pegawai/LaporanPegawai.jsx src/pages/pegawai/LaporanPegawai.test.jsx CHANGELOG.md
git commit -m "fix: bind report page actions to route id"
```

### Task 11: UI Deadline dan Alasan Penguncian

**Files:**
- Create: `src/features/laporan/reportWindow.js`
- Create: `src/features/laporan/reportWindow.test.js`
- Modify: `src/pages/pegawai/LaporanPegawai.jsx`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `report_window` dari backend.
- Produces: `getReportWindowPresentation(reportWindow)` dengan `{ tone, title, message, editable }`.

- [ ] **Step 1: Tulis test presentation untuk aktif, hari terakhir, expired, dan finance lock**

```js
expect(getReportWindowPresentation({ editable: true, remaining_days: 0 }).title)
  .toBe('Hari terakhir penyelesaian laporan');
expect(getReportWindowPresentation({ editable: false, lock_reason: 'deadline_passed' }).tone)
  .toBe('danger');
```

- [ ] **Step 2: Jalankan test dan pastikan gagal karena presenter belum ada**

Run: `npm test -- src/features/laporan/reportWindow.test.js`  
Expected: FAIL dengan module belum ditemukan.

- [ ] **Step 3: Implementasikan presenter murni tanpa hitung ulang timezone**

```js
export function getReportWindowPresentation(window) {
  if (window.lock_reason === 'finance_processing') {
    return { tone: 'warning', title: 'Laporan sedang diproses', message: 'Perubahan dikunci selama proses keuangan.', editable: false };
  }
  if (window.lock_reason === 'deadline_passed') {
    return { tone: 'danger', title: 'Batas laporan berakhir', message: `Laporan terkunci sejak ${window.deadline_date}.`, editable: false };
  }
  if (window.remaining_days === 0) {
    return { tone: 'danger', title: 'Hari terakhir penyelesaian laporan', message: `Selesaikan laporan hari ini sebelum 23:59 WITA.`, editable: true };
  }
  return { tone: 'success', title: 'Laporan masih dapat diubah', message: `Sisa ${window.remaining_days} hari, sampai ${window.deadline_date}.`, editable: true };
}
```

- [ ] **Step 4: Tampilkan kartu deadline dekat judul surat**

Kartu menampilkan tanggal selesai perjalanan, deadline, timezone WITA, sisa hari, dan alasan lock.

- [ ] **Step 5: Disable seluruh tombol edit ketika `editable === false`**

Tombol edit harian, upload TTD, upload/reset nota, dan kirim laporan diberi `disabled`, tooltip alasan, dan guard pada handler.

- [ ] **Step 6: Jangan mengandalkan disable frontend sebagai keamanan**

Jika request tetap mendapat `409`, refresh data dan tampilkan pesan backend; backend Task 6 tetap menjadi enforcement final.

- [ ] **Step 7: Jalankan unit test, page test, accessibility query, dan build**

Run: `npm test -- src/features/laporan/reportWindow.test.js src/pages/pegawai/LaporanPegawai.test.jsx && npm run build`  
Expected: PASS dan build exit 0.

- [ ] **Step 8: Update `CHANGELOG.md` dan commit Task 11**

```bash
git add src/features/laporan/reportWindow.js src/features/laporan/reportWindow.test.js src/pages/pegawai/LaporanPegawai.jsx CHANGELOG.md
git commit -m "feat: show report deadline and lock state"
```

### Task 12: Penyajian Multi-Tujuan dan Durasi Presensi

**Files:**
- Modify: `backend/src/controllers/laporan.controller.js`
- Modify: `src/pages/pegawai/LaporanPegawai.jsx`
- Modify: `src/pages/pegawai/ReportLaporanPegawai.jsx`
- Create: `src/features/surat-tugas/tujuanDuration.js`
- Create: `src/features/surat-tugas/tujuanDuration.test.js`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `tujuan[]` terurut dari report context.
- Produces: `countScheduledDays(tujuan)` dan UI timeline tujuan lengkap.

- [ ] **Step 1: Tulis test durasi dua tujuan berurutan**

```js
expect(countScheduledDays([
  { tanggal_mulai: '2026-09-14', tanggal_selesai: '2026-09-16' },
  { tanggal_mulai: '2026-09-17', tanggal_selesai: '2026-09-19' },
])).toBe(6);
```

- [ ] **Step 2: Tulis test defensive bahwa tanggal overlap tidak dihitung dua kali**

```js
expect(countScheduledDays([
  { tanggal_mulai: '2026-09-14', tanggal_selesai: '2026-09-16' },
  { tanggal_mulai: '2026-09-16', tanggal_selesai: '2026-09-17' },
])).toBe(4);
```

- [ ] **Step 3: Jalankan test dan pastikan gagal karena util belum ada**

Run: `npm test -- src/features/surat-tugas/tujuanDuration.test.js`  
Expected: FAIL dengan module belum ditemukan.

- [ ] **Step 4: Implementasikan penghitungan berbasis set tanggal UTC**

```js
export function countScheduledDays(tujuan = []) {
  const dates = new Set();
  tujuan.forEach(({ tanggal_mulai, tanggal_selesai }) => {
    const start = new Date(`${tanggal_mulai}T00:00:00Z`);
    const end = new Date(`${tanggal_selesai}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return;
    for (let date = start; date <= end; date = new Date(date.getTime() + 86400000)) {
      dates.add(date.toISOString().slice(0, 10));
    }
  });
  return dates.size;
}
```

- [ ] **Step 5: Gunakan `tujuan` untuk durasi dan progres presensi**

Fallback ke tanggal envelope surat hanya untuk record legacy yang belum mempunyai child `surat_tugas_tujuan`.

- [ ] **Step 6: Tampilkan semua tujuan pada halaman progres dan riwayat**

Setiap tujuan menampilkan nomor urut, nama daerah, tanggal mulai–selesai, dan badge `Aktif hari ini` bila ID cocok dengan `tujuan_aktif`.

- [ ] **Step 7: Pastikan response backend menyertakan tujuan terurut**

Gunakan association `as: 'tujuan'` dengan order `urutan ASC`; jangan hanya menampilkan kolom legacy `daerah_tujuan`.

- [ ] **Step 8: Jalankan frontend test, backend explicit-assignment test, lint, dan build**

Run: `npm test -- src/features/surat-tugas/tujuanDuration.test.js && cd backend && node --test tests/integration/laporan.explicit-assignment.test.js`  
Run: `cd .. && npm run lint && npm run build`  
Expected: seluruh command exit 0.

- [ ] **Step 9: Update `CHANGELOG.md` dan commit Task 12**

```bash
git add backend/src/controllers/laporan.controller.js src/pages/pegawai/LaporanPegawai.jsx src/pages/pegawai/ReportLaporanPegawai.jsx src/features/surat-tugas/tujuanDuration.js src/features/surat-tugas/tujuanDuration.test.js CHANGELOG.md
git commit -m "feat: show multi-destination report timeline"
```

### Task 13: Regression, QA Manual, Rollout, dan Rollback

**Files:**
- Modify: `backend/tests/integration/laporan.explicit-assignment.test.js`
- Modify: `backend/tests/integration/laporan.edit-window.test.js`
- Modify: `src/pages/pegawai/LaporanPegawai.test.jsx`
- Modify: `src/pages/pegawai/ReportLaporanPegawai.test.jsx`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: seluruh endpoint, service, route, migration, dan UI Tasks 1–12.
- Produces: bukti test lengkap, panduan QA, prosedur rollout, serta rollback yang dapat dijalankan.

- [ ] **Step 1: Tambahkan regression scenario end-to-end dua surat**

Fixture membuat Surat A dan B, presensi berbeda, laporan berbeda, serta memastikan semua GET/POST/PUT tetap terisolasi berdasarkan ID.

- [ ] **Step 2: Tambahkan regression scenario tujuh hari WITA**

Gunakan clock tetap untuk hari selesai, deadline, satu detik sebelum pergantian tanggal WITA, dan satu detik setelah deadline.

- [ ] **Step 3: Tambahkan regression authorization**

Token Pegawai A mencoba semua endpoint Surat B dan harus menerima `404`; tidak ada row atau file manifest yang berubah.

- [ ] **Step 4: Jalankan seluruh verifikasi otomatis backend**

Run: `cd backend && npm test && npm run lint`  
Expected: seluruh unit/integration test PASS dan lint exit 0.

- [ ] **Step 5: Jalankan seluruh verifikasi otomatis frontend**

Run: `npm test && npm run lint && npm run build`  
Expected: seluruh test PASS, lint exit 0, dan Vite build selesai.

- [ ] **Step 6: Jalankan flow QA manual lokal sebagai admin**

Login admin, buat satu pegawai uji dan satu surat dengan Buol 14–16 serta Tolitoli 17–19, simpan, buka detail kembali, dan pastikan dua tujuan tetap terurut dalam satu surat.

- [ ] **Step 7: Jalankan flow QA manual lokal sebagai pegawai**

Login pegawai, buka Surat A dari dashboard, buka Surat B dari riwayat, kembali ke Surat A, lalu pastikan URL, nomor surat, tujuan, presensi, TTD, nota, laporan, dan status selalu mengikuti ID yang dipilih.

- [ ] **Step 8: Jalankan QA deadline dan penguncian**

Gunakan fixture tanggal untuk memverifikasi edit sebelum deadline, tepat pada deadline, setelah deadline, status `dikirim`, status dikembalikan dengan catatan, dan status `dicek_keuangan`.

- [ ] **Step 9: Dokumentasikan setup, route, dan QA di `README.md`**

Tambahkan perintah migration, perintah test, URL flow manual, definisi deadline WITA, serta daftar endpoint legacy yang masih tersedia.

- [ ] **Step 10: Buat backup dan jalankan preflight production**

```bash
& pg_dump --format=custom --file=catur-before-report-integrity.dump $env:DATABASE_URL
& psql $env:DATABASE_URL -c "SELECT surat_tugas_id, pegawai_id, COUNT(*) FROM laporan_perjalanan GROUP BY surat_tugas_id, pegawai_id HAVING COUNT(*) > 1;"
```

Expected: backup berhasil dan preflight duplicate menghasilkan nol baris sebelum migration.

- [ ] **Step 11: Deploy ke staging dan ulangi smoke test**

Jalankan migration, backend, dan build frontend di staging; verifikasi login empat role, create surat multi-tujuan, pemilihan laporan berdasarkan ID, upload file, deadline, dan history.

- [ ] **Step 12: Siapkan rollback terukur**

Rollback aplikasi ke commit release sebelumnya. Jika index perlu dilepas, jalankan `DROP INDEX IF EXISTS uq_laporan_perjalanan_surat_pegawai;`. Nilai enum `draft` dibiarkan karena penghapusan enum PostgreSQL berisiko dan tidak mengganggu versi lama. Pulihkan database dari dump hanya jika migration/data verification gagal.

- [ ] **Step 13: Update record final `CHANGELOG.md`**

Catat seluruh file akhir, simbol, enum/index, endpoint, hasil test, hasil QA, backup path, migration result, staging result, risiko tersisa, rollback, dan commit release.

- [ ] **Step 14: Commit dokumentasi dan bukti verifikasi**

```bash
git add backend/tests src/pages/pegawai/LaporanPegawai.test.jsx src/pages/pegawai/ReportLaporanPegawai.test.jsx README.md CHANGELOG.md
git commit -m "test: verify report selection and deadline flow"
```

---

## Checkpoint Eksekusi

| Batch | Task | Gate sebelum lanjut |
|---|---|---|
| Batch 1 — Fondasi | 1–3 | Unit test tanggal/context lulus; migration tervalidasi pada `catur_test` |
| Batch 2 — Backend eksplisit | 4–6 | Seluruh read/write A dan B terisolasi; deadline enforced backend |
| Batch 3 — Frontend eksplisit | 7–10 | Seluruh navigasi dan aksi memakai route ID; build lulus |
| Batch 4 — UX dan multi-tujuan | 11–12 | Deadline dan seluruh tujuan tampil; durasi presensi benar |
| Batch 5 — Release | 13 | Full test, QA lokal, backup, staging, rollout, dan rollback siap |

## Definition of Done

- [ ] Seluruh 13 task dan checklist-nya ditandai selesai berdasarkan bukti.
- [ ] `CHANGELOG.md` memiliki satu record lengkap untuk setiap task.
- [ ] Tidak ada endpoint web laporan yang bergantung pada record latest.
- [ ] Seluruh operasi write tervalidasi kepemilikan dan report window.
- [ ] Satu surat hanya mempunyai satu laporan akhir per pegawai.
- [ ] Semua tujuan tampil dan tujuan aktif sesuai tanggal WITA.
- [ ] Riwayat lama dapat dibuka kembali melalui ID.
- [ ] Deadline tujuh hari tampil dan ditegakkan backend.
- [ ] Backend test dan lint lulus.
- [ ] Frontend test, lint, dan build lulus.
- [ ] QA manual admin dan pegawai lulus.
- [ ] Backup dan rollback telah diverifikasi sebelum production.
- [ ] Tidak ada credential, `.env`, dump, token, atau uploads yang masuk commit.
- [ ] Commit history per task jelas dan dapat di-rollback per batch.
