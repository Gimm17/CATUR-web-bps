const DAY_IN_MS = 86_400_000;

export function countScheduledDays(tujuan = []) {
  const dates = new Set();

  tujuan.forEach(({ tanggal_mulai: startValue, tanggal_selesai: endValue } = {}) => {
    const start = new Date(`${startValue}T00:00:00Z`);
    const end = new Date(`${endValue}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return;

    for (let date = start; date <= end; date = new Date(date.getTime() + DAY_IN_MS)) {
      dates.add(date.toISOString().slice(0, 10));
    }
  });

  return dates.size;
}
