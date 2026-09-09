const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateTujuanSchedule,
} = require('../../src/domain/suratTugas/validateTujuanSchedule');

test('sorts destinations by date and assigns a stable one-based order', () => {
  const result = validateTujuanSchedule([
    { daerah_id: '23', tanggal_mulai: '2026-09-09', tanggal_selesai: '2026-09-10' },
    { daerah_id: 17, tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-08' },
  ]);

  assert.deepEqual(result, [
    { daerah_id: 17, tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-08', urutan: 1 },
    { daerah_id: 23, tanggal_mulai: '2026-09-09', tanggal_selesai: '2026-09-10', urutan: 2 },
  ]);
});

test('rejects an overlapping transition date instead of choosing one destination', () => {
  assert.throws(
    () => validateTujuanSchedule([
      { daerah_id: 17, tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-09' },
      { daerah_id: 23, tanggal_mulai: '2026-09-09', tanggal_selesai: '2026-09-10' },
    ]),
    (error) => error.code === 'TUJUAN_OVERLAP' && error.index === 1
  );
});

test('rejects an unmapped day between consecutive destinations', () => {
  assert.throws(
    () => validateTujuanSchedule([
      { daerah_id: 17, tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-08' },
      { daerah_id: 23, tanggal_mulai: '2026-09-10', tanggal_selesai: '2026-09-11' },
    ]),
    (error) => error.code === 'TUJUAN_DATE_GAP' && error.index === 1
  );
});

test('rejects an empty destination schedule', () => {
  assert.throws(
    () => validateTujuanSchedule([]),
    (error) => error.code === 'TUJUAN_REQUIRED'
  );
});

test('rejects invalid region IDs with the original input index', () => {
  assert.throws(
    () => validateTujuanSchedule([
      { daerah_id: 'not-an-id', tanggal_mulai: '2026-09-07', tanggal_selesai: '2026-09-08' },
    ]),
    (error) => error.code === 'INVALID_DAERAH' && error.index === 0
  );
});

test('rejects impossible and reversed date ranges', () => {
  assert.throws(
    () => validateTujuanSchedule([
      { daerah_id: 17, tanggal_mulai: '2026-02-30', tanggal_selesai: '2026-03-01' },
    ]),
    (error) => error.code === 'INVALID_DATE_RANGE' && error.index === 0
  );
  assert.throws(
    () => validateTujuanSchedule([
      { daerah_id: 17, tanggal_mulai: '2026-09-08', tanggal_selesai: '2026-09-07' },
    ]),
    (error) => error.code === 'INVALID_DATE_RANGE' && error.index === 0
  );
});
