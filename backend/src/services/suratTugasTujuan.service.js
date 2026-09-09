const { Op } = require('sequelize');
const Daerah = require('../models/daerah.model');
const SuratTugasTujuan = require('../models/suratTugasTujuan.model');
const Presensi = require('../models/presensi.model');
const { isDateWithin } = require('../utils/businessDate');
const {
  TujuanScheduleError,
  validateTujuanSchedule,
} = require('../domain/suratTugas/validateTujuanSchedule');

class TujuanRequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'TujuanRequestError';
    this.status = status;
    this.code = code;
  }
}

function parseTujuanField(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ditangani sebagai payload tidak valid di bawah.
    }
  }

  throw new TujuanRequestError(
    422,
    'INVALID_TUJUAN_PAYLOAD',
    'Tujuan harus berupa array JSON.'
  );
}

function hasValidZone(daerah) {
  if (daerah.geojson) return true;

  const latitude = Number(daerah.latitude);
  const longitude = Number(daerah.longitude);
  const radius = Number(daerah.radius);
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Number.isFinite(radius) &&
    radius > 0;
}

async function prepareTujuan(rawTujuan, transaction) {
  let schedule;
  try {
    schedule = validateTujuanSchedule(rawTujuan);
  } catch (error) {
    if (error instanceof TujuanScheduleError) {
      error.status = 422;
    }
    throw error;
  }

  const daerahIds = [...new Set(schedule.map((item) => item.daerah_id))];
  const daerahRows = await Daerah.findAll({
    where: { id: { [Op.in]: daerahIds } },
    transaction,
  });
  const daerahById = new Map(daerahRows.map((daerah) => [daerah.id, daerah]));

  return schedule.map((item) => {
    const daerah = daerahById.get(item.daerah_id);
    if (!daerah) {
      throw new TujuanRequestError(
        404,
        'DAERAH_NOT_FOUND',
        `Daerah tujuan ${item.daerah_id} tidak ditemukan.`
      );
    }
    if (!hasValidZone(daerah)) {
      throw new TujuanRequestError(
        400,
        'DAERAH_ZONE_UNAVAILABLE',
        'Area daerah belum tersedia. Gunakan GeoJSON atau atur titik koordinat dan radius terlebih dahulu.'
      );
    }

    return {
      ...item,
      daerah_tujuan: daerah.nama_daerah,
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: Number(daerah.radius),
    };
  });
}

async function replaceTujuan({ surat, tujuan, transaction }) {
  const presensiRows = await Presensi.findAll({
    where: { surat_tugas_id: surat.id },
    attributes: ['id', 'tanggal_presensi'],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const remap = presensiRows.map((presensi) => {
    const targetIndex = tujuan.findIndex((item) => isDateWithin(
      presensi.tanggal_presensi,
      item.tanggal_mulai,
      item.tanggal_selesai
    ));
    if (targetIndex === -1) {
      throw new TujuanRequestError(
        409,
        'SCHEDULE_HAS_PRESENCE',
        `Jadwal baru tidak mencakup presensi tanggal ${presensi.tanggal_presensi}.`
      );
    }
    return { presensiId: presensi.id, targetIndex };
  });

  if (presensiRows.length > 0) {
    await Presensi.update(
      { surat_tugas_tujuan_id: null },
      { where: { surat_tugas_id: surat.id }, transaction }
    );
  }
  await SuratTugasTujuan.destroy({
    where: { surat_tugas_id: surat.id },
    transaction,
  });

  const createdTujuan = await SuratTugasTujuan.bulkCreate(
    tujuan.map((item) => ({
      ...item,
      surat_tugas_id: surat.id,
    })),
    { transaction }
  );

  for (const item of remap) {
    await Presensi.update(
      { surat_tugas_tujuan_id: createdTujuan[item.targetIndex].id },
      { where: { id: item.presensiId }, transaction }
    );
  }

  return createdTujuan;
}

module.exports = {
  TujuanRequestError,
  parseTujuanField,
  prepareTujuan,
  replaceTujuan,
};
