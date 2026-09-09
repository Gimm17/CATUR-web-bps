const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getBusinessDate,
  addBusinessDays,
  isDateWithin,
} = require('../../src/utils/businessDate');

test('getBusinessDate uses the new WITA day at 00:30 WITA', () => {
  assert.equal(
    getBusinessDate(new Date('2026-09-08T16:30:00.000Z')),
    '2026-09-09'
  );
});

test('getBusinessDate keeps the previous WITA day before midnight', () => {
  assert.equal(
    getBusinessDate(new Date('2026-09-08T15:59:59.999Z')),
    '2026-09-08'
  );
});

test('isDateWithin treats both destination boundaries as inclusive', () => {
  assert.equal(isDateWithin('2026-09-07', '2026-09-07', '2026-09-08'), true);
  assert.equal(isDateWithin('2026-09-08', '2026-09-07', '2026-09-08'), true);
  assert.equal(isDateWithin('2026-09-09', '2026-09-07', '2026-09-08'), false);
});

test('addBusinessDays crosses month and year boundaries without local timezone drift', () => {
  assert.equal(addBusinessDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addBusinessDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addBusinessDays('2026-09-08', -1), '2026-09-07');
});

test('date helpers reject calendar dates and offsets with invalid formats', () => {
  assert.throws(() => addBusinessDays('2026-02-30', 1), /Invalid business date/);
  assert.throws(() => isDateWithin('2026-09-07T00:00:00Z', '2026-09-07', '2026-09-08'), /Invalid business date/);
});
