const {
  BUSINESS_TIMEZONE,
  getBusinessDate,
  addBusinessDays,
  differenceInBusinessDates,
} = require('../utils/businessDate');

const EDITABLE_STATUSES = new Set(['', 'draft', 'dikirim']);
const REPORT_EDIT_WINDOW_DAYS = 10;

function normalizeDate(value) {
  return addBusinessDays(value, 0);
}

function getLastDestinationEndDate({ tujuan = [], fallbackEndDate } = {}) {
  const destinationDates = Array.isArray(tujuan)
    ? tujuan
        .map((item) => item?.tanggal_selesai)
        .filter(Boolean)
        .map(normalizeDate)
    : [];

  if (destinationDates.length > 0) {
    return destinationDates.sort().at(-1);
  }

  if (fallbackEndDate) {
    return normalizeDate(fallbackEndDate);
  }

  throw new TypeError('Tanggal selesai surat tugas tidak tersedia');
}

function buildReportWindow({
  tujuan = [],
  fallbackEndDate,
  status,
  now = new Date(),
} = {}) {
  const tripEndDate = getLastDestinationEndDate({ tujuan, fallbackEndDate });
  const deadlineDate = addBusinessDays(tripEndDate, REPORT_EDIT_WINDOW_DAYS);
  const currentDate = getBusinessDate(now);
  const normalizedStatus = String(status || '').toLowerCase();
  const statusLocked = !EDITABLE_STATUSES.has(normalizedStatus);
  const deadlinePassed = currentDate > deadlineDate;
  const remainingDays = Math.max(
    0,
    differenceInBusinessDates(currentDate, deadlineDate)
  );

  return {
    timezone: BUSINESS_TIMEZONE,
    trip_end_date: tripEndDate,
    deadline_date: deadlineDate,
    editable: !statusLocked && !deadlinePassed,
    remaining_days: remainingDays,
    lock_reason: statusLocked
      ? 'finance_processing'
      : (deadlinePassed ? 'deadline_passed' : null),
  };
}

function assertReportEditable(reportWindow) {
  if (reportWindow?.editable) return;

  const deadlinePassed = reportWindow?.lock_reason === 'deadline_passed';
  const error = new Error(
    deadlinePassed
      ? 'Batas penyelesaian laporan telah berakhir.'
      : 'Laporan sudah masuk proses keuangan.'
  );
  error.status = 409;
  error.code = deadlinePassed
    ? 'REPORT_DEADLINE_PASSED'
    : 'REPORT_LOCKED_BY_STATUS';
  error.reportWindow = reportWindow;
  throw error;
}

module.exports = {
  getLastDestinationEndDate,
  buildReportWindow,
  assertReportEditable,
};
