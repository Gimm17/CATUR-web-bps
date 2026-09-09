const test = require('node:test');
const assert = require('node:assert/strict');
const {
  selectActiveDestination,
} = require('../../src/services/activeAssignment.service');

const tujuan = [
  {
    id: 201,
    urutan: 1,
    daerah_tujuan: 'Poso',
    tanggal_mulai: '2026-09-07',
    tanggal_selesai: '2026-09-08',
  },
  {
    id: 202,
    urutan: 2,
    daerah_tujuan: 'Morowali',
    tanggal_mulai: '2026-09-09',
    tanggal_selesai: '2026-09-10',
  },
];

for (const [date, expectedId] of [
  ['2026-09-06', null],
  ['2026-09-07', 201],
  ['2026-09-08', 201],
  ['2026-09-09', 202],
  ['2026-09-10', 202],
  ['2026-09-11', null],
]) {
  test(`memilih tujuan aktif yang tepat pada ${date}`, () => {
    const selected = selectActiveDestination(tujuan, date);
    assert.equal(selected?.id ?? null, expectedId);
  });
}
