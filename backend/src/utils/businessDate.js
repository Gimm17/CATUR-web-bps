const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Makassar';
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseBusinessDate(value) {
  const match = DATE_PATTERN.exec(String(value));
  if (!match) {
    throw new TypeError(`Invalid business date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError(`Invalid business date: ${value}`);
  }

  return date;
}

function formatUtcDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getBusinessDate(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('Invalid current date');
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function addBusinessDays(value, days) {
  if (!Number.isInteger(days)) {
    throw new TypeError('Business day offset must be an integer');
  }

  const date = parseBusinessDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

function isDateWithin(value, start, end) {
  const normalizedValue = formatUtcDate(parseBusinessDate(value));
  const normalizedStart = formatUtcDate(parseBusinessDate(start));
  const normalizedEnd = formatUtcDate(parseBusinessDate(end));
  return normalizedValue >= normalizedStart && normalizedValue <= normalizedEnd;
}

module.exports = {
  BUSINESS_TIMEZONE,
  getBusinessDate,
  addBusinessDays,
  isDateWithin,
};
