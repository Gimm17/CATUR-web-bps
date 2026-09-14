const { buildReportWindow } = require('./reportWindow.service');

function getDefaultDependencies() {
  return {
    SuratTugasModel: require('../models/suratTugas.model'),
    SuratTugasTujuanModel: require('../models/suratTugasTujuan.model'),
    LaporanPerjalananModel: require('../models/laporan.perjalanan'),
  };
}

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizePositiveInteger(value, errorCode, message) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw createHttpError(400, errorCode, message);
  }
  return normalized;
}

function toPlainSurat(surat) {
  const plain = typeof surat.toJSON === 'function' ? surat.toJSON() : { ...surat };
  plain.tujuan = Array.isArray(plain.tujuan)
    ? [...plain.tujuan].sort((left, right) => Number(left.urutan) - Number(right.urutan))
    : [];
  return plain;
}

function createReportContextService(dependencies) {
  const {
    SuratTugasModel,
    SuratTugasTujuanModel,
    LaporanPerjalananModel,
  } = dependencies || getDefaultDependencies();
  async function getOwnedReportContext({ suratId, userId, now } = {}) {
    const normalizedSuratId = normalizePositiveInteger(
      suratId,
      'INVALID_SURAT_ID',
      'ID surat tugas tidak valid.'
    );
    const normalizedUserId = normalizePositiveInteger(
      userId,
      'INVALID_USER_ID',
      'ID pengguna tidak valid.'
    );

    const suratRecord = await SuratTugasModel.findOne({
      where: { id: normalizedSuratId, user_id: normalizedUserId },
      include: [{
        model: SuratTugasTujuanModel,
        as: 'tujuan',
        separate: true,
        order: [['urutan', 'ASC']],
      }],
    });

    if (!suratRecord) {
      throw createHttpError(
        404,
        'SURAT_NOT_FOUND',
        'Surat tugas tidak ditemukan.'
      );
    }

    const surat = toPlainSurat(suratRecord);
    const laporan = await LaporanPerjalananModel.findOne({
      where: {
        surat_tugas_id: normalizedSuratId,
        pegawai_id: normalizedUserId,
      },
    });
    const reportWindow = buildReportWindow({
      tujuan: surat.tujuan,
      fallbackEndDate: surat.tanggal_selesai,
      status: laporan?.status,
      now,
    });

    return { surat, laporan, reportWindow };
  }

  return { getOwnedReportContext };
}

async function getOwnedReportContext(input) {
  return createReportContextService().getOwnedReportContext(input);
}

module.exports = {
  createReportContextService,
  getOwnedReportContext,
};
