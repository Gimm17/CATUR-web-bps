const { addBusinessDays } = require('../../utils/businessDate');

class TujuanScheduleError extends Error {
  constructor(code, message, index = null) {
    super(message);
    this.name = 'TujuanScheduleError';
    this.code = code;
    this.index = index;
  }
}

function normalizeDaerahId(value, index) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) {
    throw new TujuanScheduleError(
      'INVALID_DAERAH',
      'Daerah tujuan tidak valid.',
      index
    );
  }

  const daerahId = Number(text);
  if (!Number.isSafeInteger(daerahId) || daerahId <= 0) {
    throw new TujuanScheduleError(
      'INVALID_DAERAH',
      'Daerah tujuan tidak valid.',
      index
    );
  }
  return daerahId;
}

function normalizeDateRange(item, index) {
  const tanggalMulai = String(item?.tanggal_mulai ?? '').trim();
  const tanggalSelesai = String(item?.tanggal_selesai ?? '').trim();

  try {
    addBusinessDays(tanggalMulai, 0);
    addBusinessDays(tanggalSelesai, 0);
  } catch {
    throw new TujuanScheduleError(
      'INVALID_DATE_RANGE',
      'Rentang tanggal tujuan tidak valid.',
      index
    );
  }

  if (tanggalMulai > tanggalSelesai) {
    throw new TujuanScheduleError(
      'INVALID_DATE_RANGE',
      'Tanggal mulai tujuan tidak boleh melewati tanggal selesai.',
      index
    );
  }

  return { tanggalMulai, tanggalSelesai };
}

function validateTujuanSchedule(rawTujuan) {
  if (!Array.isArray(rawTujuan) || rawTujuan.length === 0) {
    throw new TujuanScheduleError(
      'TUJUAN_REQUIRED',
      'Minimal satu tujuan wajib diisi.'
    );
  }

  const normalized = rawTujuan.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TujuanScheduleError(
        'INVALID_DAERAH',
        'Data tujuan tidak valid.',
        index
      );
    }

    const { tanggalMulai, tanggalSelesai } = normalizeDateRange(item, index);
    return {
      daerah_id: normalizeDaerahId(item.daerah_id, index),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      inputIndex: index,
    };
  });

  normalized.sort((left, right) =>
    left.tanggal_mulai.localeCompare(right.tanggal_mulai) ||
    left.tanggal_selesai.localeCompare(right.tanggal_selesai)
  );

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];

    if (current.tanggal_mulai <= previous.tanggal_selesai) {
      throw new TujuanScheduleError(
        'TUJUAN_OVERLAP',
        'Rentang tanggal tujuan tidak boleh tumpang tindih.',
        current.inputIndex
      );
    }

    if (current.tanggal_mulai !== addBusinessDays(previous.tanggal_selesai, 1)) {
      throw new TujuanScheduleError(
        'TUJUAN_DATE_GAP',
        'Tidak boleh ada hari kosong di antara tujuan.',
        current.inputIndex
      );
    }
  }

  return normalized.map((item, index) => ({
    daerah_id: item.daerah_id,
    tanggal_mulai: item.tanggal_mulai,
    tanggal_selesai: item.tanggal_selesai,
    urutan: index + 1,
  }));
}

module.exports = {
  TujuanScheduleError,
  validateTujuanSchedule,
};
