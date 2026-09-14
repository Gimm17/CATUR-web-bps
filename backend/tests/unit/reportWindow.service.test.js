const test = require('node:test');
const assert = require('node:assert/strict');

const {
  differenceInBusinessDates,
} = require('../../src/utils/businessDate');
const {
  getLastDestinationEndDate,
  buildReportWindow,
  assertReportEditable,
} = require('../../src/services/reportWindow.service');

test('differenceInBusinessDates menghitung selisih kalender lintas bulan', () => {
  assert.equal(differenceInBusinessDates('2026-09-26', '2026-10-02'), 6);
  assert.equal(differenceInBusinessDates('2026-10-02', '2026-09-26'), -6);
});

test('deadline tujuh hari dihitung dari tanggal selesai tujuan paling akhir', () => {
  const result = buildReportWindow({
    tujuan: [
      { urutan: 2, tanggal_selesai: '2026-09-19' },
      { urutan: 1, tanggal_selesai: '2026-09-16' },
    ],
    fallbackEndDate: '2026-09-18',
    status: 'draft',
    now: new Date('2026-09-20T00:00:00+08:00'),
  });

  assert.deepEqual(result, {
    timezone: 'Asia/Makassar',
    trip_end_date: '2026-09-19',
    deadline_date: '2026-09-26',
    editable: true,
    remaining_days: 6,
    lock_reason: null,
  });
});

test('tanggal selesai header dipakai untuk surat legacy tanpa child tujuan', () => {
  assert.equal(getLastDestinationEndDate({
    tujuan: [],
    fallbackEndDate: '2026-09-19',
  }), '2026-09-19');
});

test('laporan tetap editable pada seluruh hari terakhir deadline WITA', () => {
  const result = buildReportWindow({
    tujuan: [{ tanggal_selesai: '2026-09-19' }],
    status: 'dikirim',
    now: new Date('2026-09-26T23:59:59+08:00'),
  });

  assert.equal(result.editable, true);
  assert.equal(result.remaining_days, 0);
  assert.equal(result.lock_reason, null);
});

test('laporan terkunci ketika tanggal WITA melewati deadline', () => {
  const result = buildReportWindow({
    tujuan: [{ tanggal_selesai: '2026-09-19' }],
    status: 'draft',
    now: new Date('2026-09-27T00:00:00+08:00'),
  });

  assert.equal(result.editable, false);
  assert.equal(result.remaining_days, 0);
  assert.equal(result.lock_reason, 'deadline_passed');
});

for (const status of [
  'dicek_keuangan',
  'disetujui_keuangan',
  'ditandatangani',
  'pencairan_dana',
  'dana_turun',
]) {
  test(`status ${status} mengunci laporan walau deadline belum lewat`, () => {
    const result = buildReportWindow({
      tujuan: [{ tanggal_selesai: '2026-09-19' }],
      status,
      now: new Date('2026-09-20T08:00:00+08:00'),
    });

    assert.equal(result.editable, false);
    assert.equal(result.lock_reason, 'finance_processing');
  });
}

test('assertReportEditable memberi kode deadline yang stabil', () => {
  assert.throws(
    () => assertReportEditable({
      editable: false,
      lock_reason: 'deadline_passed',
      deadline_date: '2026-09-26',
    }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, 'REPORT_DEADLINE_PASSED');
      assert.equal(error.reportWindow.deadline_date, '2026-09-26');
      return true;
    }
  );
});

test('assertReportEditable memberi kode status lock yang stabil', () => {
  assert.throws(
    () => assertReportEditable({
      editable: false,
      lock_reason: 'finance_processing',
    }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, 'REPORT_LOCKED_BY_STATUS');
      return true;
    }
  );
});

test('tanggal selesai wajib tersedia dan valid', () => {
  assert.throws(
    () => getLastDestinationEndDate({ tujuan: [], fallbackEndDate: null }),
    /Tanggal selesai surat tugas tidak tersedia/
  );
  assert.throws(
    () => getLastDestinationEndDate({
      tujuan: [{ tanggal_selesai: '2026-02-30' }],
      fallbackEndDate: null,
    }),
    /Invalid business date/
  );
});

