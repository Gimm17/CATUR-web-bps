const {
  getBusinessDate,
  isDateWithin,
} = require('../utils/businessDate');

class ActiveAssignmentConflictError extends Error {
  constructor(assignmentIds) {
    super('Lebih dari satu surat tugas aktif ditemukan pada tanggal yang sama.');
    this.name = 'ActiveAssignmentConflictError';
    this.code = 'ACTIVE_ASSIGNMENT_CONFLICT';
    this.assignmentIds = [...assignmentIds].sort((left, right) => left - right);
  }
}

function selectActiveDestination(tujuan, date) {
  if (!Array.isArray(tujuan)) return null;
  return tujuan.find((item) => isDateWithin(
    date,
    item.tanggal_mulai,
    item.tanggal_selesai
  )) || null;
}

function legacyDestinationFromSurat(surat) {
  return {
    id: null,
    surat_tugas_id: surat.id,
    daerah_id: surat.daerah_id,
    urutan: 1,
    daerah_tujuan: surat.daerah_tujuan,
    latitude: surat.latitude,
    longitude: surat.longitude,
    radius: surat.radius,
    tanggal_mulai: surat.tanggal_mulai,
    tanggal_selesai: surat.tanggal_selesai,
    daerah: surat.daerah || null,
    legacy: true,
  };
}

async function resolveActiveAssignment(userId, date = getBusinessDate()) {
  const { Op } = require('sequelize');
  const SuratTugas = require('../models/suratTugas.model');
  const SuratTugasTujuan = require('../models/suratTugasTujuan.model');
  const Daerah = require('../models/daerah.model');

  const assignments = await SuratTugas.findAll({
    where: {
      user_id: userId,
      status: { [Op.iLike]: 'aktif' },
    },
    include: [
      {
        model: SuratTugasTujuan,
        as: 'tujuan',
        required: false,
        include: [{ model: Daerah, as: 'daerah', required: false }],
      },
      { model: Daerah, as: 'daerah', required: false },
    ],
    order: [
      ['id', 'ASC'],
      [{ model: SuratTugasTujuan, as: 'tujuan' }, 'urutan', 'ASC'],
    ],
  });

  const candidates = assignments.flatMap((surat) => {
    const allTujuan = surat.tujuan || [];
    const tujuanAktif = allTujuan.length > 0
      ? selectActiveDestination(allTujuan, date)
      : (isDateWithin(date, surat.tanggal_mulai, surat.tanggal_selesai)
          ? legacyDestinationFromSurat(surat)
          : null);

    return tujuanAktif ? [{ surat, tujuanAktif }] : [];
  });

  if (candidates.length > 1) {
    throw new ActiveAssignmentConflictError(
      candidates.map((candidate) => candidate.surat.id)
    );
  }
  if (candidates.length === 0) return null;

  return {
    ...candidates[0],
    tanggalServer: date,
  };
}

module.exports = {
  ActiveAssignmentConflictError,
  resolveActiveAssignment,
  selectActiveDestination,
};
