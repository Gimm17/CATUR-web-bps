const SuratTugas = require('../models/suratTugas.model');

exports.createSuratTugas = async (data, adminId) => {
  return await SuratTugas.create({
    ...data,
    created_by: adminId,
  });
};

exports.getAllSuratTugas = async () => {
  return await SuratTugas.findAll({
    order: [['created_at', 'DESC']],
  });
};

exports.getSuratTugasByUser = async (userId) => {
  return await SuratTugas.findAll({
    where: {
      user_id: userId,
      status: 'aktif',
    },
  });
};

exports.getDetailSuratTugas = async (id) => {
  return await SuratTugas.findByPk(id);
};

exports.nonaktifkanSuratTugas = async (id) => {
  return await SuratTugas.update(
    { status: 'selesai' },
    { where: { id } }
  );
};
