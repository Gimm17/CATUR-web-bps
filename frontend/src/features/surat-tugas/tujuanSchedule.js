let nextRowId = 1;

export function createEmptyTujuan(key = `tujuan-${nextRowId++}`) {
  return {
    key,
    daerah_id: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
  };
}

function addOneDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return '';
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

export function createNextTujuan(previous) {
  const nextDate = addOneDay(previous?.tanggal_selesai);
  return {
    ...createEmptyTujuan(),
    tanggal_mulai: nextDate,
    tanggal_selesai: nextDate,
  };
}

export function getTujuanScheduleErrors(rows) {
  const errors = {};

  rows.forEach((row, index) => {
    const rowErrors = {};
    if (!row.daerah_id) rowErrors.daerah_id = 'Wilayah tujuan wajib dipilih.';
    if (!row.tanggal_mulai || !row.tanggal_selesai) {
      rowErrors.tanggal = 'Tanggal mulai dan selesai wajib diisi.';
    } else if (row.tanggal_mulai > row.tanggal_selesai) {
      rowErrors.tanggal = 'Tanggal mulai tidak boleh melewati tanggal selesai.';
    }

    if (index > 0 && row.tanggal_mulai && rows[index - 1].tanggal_selesai) {
      const expectedStart = addOneDay(rows[index - 1].tanggal_selesai);
      if (row.tanggal_mulai <= rows[index - 1].tanggal_selesai) {
        rowErrors.schedule = 'Tanggal tujuan bertumpang tindih.';
      } else if (row.tanggal_mulai !== expectedStart) {
        rowErrors.schedule = 'Tidak boleh ada tanggal kosong antar tujuan.';
      }
    }

    if (Object.keys(rowErrors).length > 0) errors[row.key] = rowErrors;
  });

  return errors;
}

export function hasTujuanScheduleErrors(errors) {
  return Object.keys(errors || {}).length > 0;
}

export function serializeTujuan(rows) {
  return JSON.stringify(rows.map(({
    daerah_id,
    tanggal_mulai,
    tanggal_selesai,
  }) => ({
    daerah_id,
    tanggal_mulai,
    tanggal_selesai,
  })));
}
