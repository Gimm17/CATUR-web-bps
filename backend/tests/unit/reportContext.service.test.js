const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createReportContextService,
} = require('../../src/services/reportContext.service');
const {
  createLoadOwnedReportContext,
} = require('../../src/middlewares/reportContext.middleware');

function createDependencies({ surat = null, laporan = null } = {}) {
  const calls = { surat: null, laporan: null };
  const SuratTugasModel = {
    async findOne(options) {
      calls.surat = options;
      return surat;
    },
  };
  const LaporanPerjalananModel = {
    async findOne(options) {
      calls.laporan = options;
      return laporan;
    },
  };

  return { SuratTugasModel, LaporanPerjalananModel, calls };
}

test('menolak surat ID yang kosong atau tidak valid sebelum query database', async () => {
  const dependencies = createDependencies();
  const service = createReportContextService(dependencies);

  for (const suratId of [undefined, '', 'abc', 0, -1, '1.5']) {
    await assert.rejects(
      () => service.getOwnedReportContext({ suratId, userId: 10 }),
      (error) => error.status === 400 && error.code === 'INVALID_SURAT_ID'
    );
  }

  assert.equal(dependencies.calls.surat, null);
});

test('surat tidak ditemukan dan surat milik orang lain sama-sama menghasilkan 404 aman', async () => {
  const dependencies = createDependencies({ surat: null });
  const service = createReportContextService(dependencies);

  await assert.rejects(
    () => service.getOwnedReportContext({ suratId: 88, userId: 10 }),
    (error) => error.status === 404
      && error.code === 'SURAT_NOT_FOUND'
      && error.message === 'Surat tugas tidak ditemukan.'
  );

  assert.deepEqual(dependencies.calls.surat.where, { id: 88, user_id: 10 });
});

test('context memuat tujuan terurut, laporan pasangan surat-pegawai, dan report window WITA', async () => {
  const surat = {
    id: 88,
    user_id: 10,
    tanggal_selesai: '2026-09-18',
    tujuan: [
      { urutan: 2, tanggal_selesai: '2026-09-19' },
      { urutan: 1, tanggal_selesai: '2026-09-18' },
    ],
  };
  const laporan = { id: 44, status: 'draft' };
  const dependencies = createDependencies({ surat, laporan });
  const service = createReportContextService(dependencies);

  const context = await service.getOwnedReportContext({
    suratId: '88',
    userId: 10,
    now: new Date('2026-09-20T00:00:00+08:00'),
  });

  assert.deepEqual(context.surat.tujuan.map((item) => item.urutan), [1, 2]);
  assert.equal(context.laporan, laporan);
  assert.equal(context.reportWindow.deadline_date, '2026-09-26');
  assert.equal(context.reportWindow.editable, true);
  assert.deepEqual(dependencies.calls.laporan.where, {
    surat_tugas_id: 88,
    pegawai_id: 10,
  });
});

test('status proses pada laporan yang ditemukan mengunci report window', async () => {
  const dependencies = createDependencies({
    surat: {
      id: 88,
      user_id: 10,
      tanggal_selesai: '2026-09-18',
      tujuan: [],
    },
    laporan: { id: 44, status: 'dicek_keuangan' },
  });
  const service = createReportContextService(dependencies);

  const context = await service.getOwnedReportContext({
    suratId: 88,
    userId: 10,
    now: new Date('2026-09-20T00:00:00+08:00'),
  });

  assert.equal(context.reportWindow.editable, false);
  assert.equal(context.reportWindow.lock_reason, 'finance_processing');
});

test('middleware mengisi req.reportContext dan melanjutkan request', async () => {
  const expectedContext = { surat: { id: 88 } };
  const loadOwnedReportContext = createLoadOwnedReportContext({
    async getOwnedReportContext(input) {
      assert.deepEqual(input, { suratId: '88', userId: 10 });
      return expectedContext;
    },
  });
  const req = { params: { suratId: '88' }, user: { id: 10 } };
  let nextCalled = false;

  await loadOwnedReportContext(req, {}, () => { nextCalled = true; });

  assert.equal(req.reportContext, expectedContext);
  assert.equal(nextCalled, true);
});

test('middleware memetakan error dikenal dan menyamarkan error internal', async () => {
  const responses = [];
  const res = {
    status(status) {
      responses.push({ status });
      return this;
    },
    json(body) {
      responses.at(-1).body = body;
      return this;
    },
  };

  const knownMiddleware = createLoadOwnedReportContext({
    async getOwnedReportContext() {
      const error = new Error('Surat tugas tidak ditemukan.');
      error.status = 404;
      error.code = 'SURAT_NOT_FOUND';
      throw error;
    },
  });
  await knownMiddleware({ params: {}, user: {} }, res, () => {});

  const internalMiddleware = createLoadOwnedReportContext({
    async getOwnedReportContext() {
      throw new Error('database password leaked');
    },
  });
  await internalMiddleware({ params: {}, user: {} }, res, () => {});

  assert.deepEqual(responses[0], {
    status: 404,
    body: {
      code: 'SURAT_NOT_FOUND',
      message: 'Surat tugas tidak ditemukan.',
    },
  });
  assert.deepEqual(responses[1], {
    status: 500,
    body: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan pada server.',
    },
  });
});
