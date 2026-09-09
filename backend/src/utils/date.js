const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Makassar';

function getTodayDate(timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

module.exports = {
  APP_TIMEZONE,
  getTodayDate,
};
