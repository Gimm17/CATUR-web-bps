const SuratTugas = require('../models/suratTugas.model');
const Daerah = require('../models/daerah.model');
const Notifikasi = require('../models/notifikasi.model');
const User = require('../models/user.model');
const Presensi = require('../models/presensi.model');
const sequelize = require('../config/database');
const {
  BUSINESS_TIMEZONE,
  isDateWithin,
} = require('../utils/businessDate');
const {
  resolveActiveAssignment,
} = require('../services/activeAssignment.service');
const {
  parseTujuanField,
  prepareTujuan,
  replaceTujuan,
} = require('../services/suratTugasTujuan.service');

/* ================= CREATE ================= */
const createSuratTugas = async (req, res) => {
  try {
    const {
      nomor_surat,
      user_id,
      daerah_id,
      tanggal_mulai,
      tanggal_selesai,
      nama_kegiatan,
      pembebanan_biaya,
      tujuan_kegiatan,
    } = req.body;

    // Validasi data baru
    if (!nama_kegiatan || nama_kegiatan.trim().length < 3) {
      return res.status(400).json({ 
        message: 'Nama kegiatan minimal 3 karakter' 
      });
    }

    if (!pembebanan_biaya) {
      return res.status(400).json({ 
        message: 'Pembebanan biaya harus diisi' 
      });
    }

    if (!tujuan_kegiatan) {
      return res.status(400).json({ 
        message: 'Tujuan kegiatan harus diisi' 
      });
    }

    const rawTujuan = Object.prototype.hasOwnProperty.call(req.body, 'tujuan')
      ? parseTujuanField(req.body.tujuan)
      : [{ daerah_id, tanggal_mulai, tanggal_selesai }];

    const result = await sequelize.transaction(async (transaction) => {
      const preparedTujuan = await prepareTujuan(rawTujuan, transaction);
      const firstTujuan = preparedTujuan[0];
      const lastTujuan = preparedTujuan[preparedTujuan.length - 1];

      const surat = await SuratTugas.create({
        nomor_surat,
        user_id,
        daerah_id: firstTujuan.daerah_id,
        daerah_tujuan: firstTujuan.daerah_tujuan,
        latitude: firstTujuan.latitude,
        longitude: firstTujuan.longitude,
        radius: firstTujuan.radius,
        tanggal_mulai: firstTujuan.tanggal_mulai,
        tanggal_selesai: lastTujuan.tanggal_selesai,
        nama_kegiatan,
        pembebanan_biaya,
        tujuan_kegiatan,
        status: 'AKTIF',
        file_surat: req.file
          ? (req.file.drive?.webContentLink || req.file.drive?.webViewLink || null)
          : null,
      }, { transaction });

      const tujuan = await replaceTujuan({
        surat,
        tujuan: preparedTujuan,
        transaction,
      });

      await Notifikasi.create({
        user_id,
        judul: 'Surat Tugas Baru',
        pesan: `Anda mendapat surat tugas untuk kegiatan: ${nama_kegiatan} di ${firstTujuan.daerah_tujuan}`,
        is_read: false,
      }, { transaction });

      return { surat, tujuan };
    });

    res.status(201).json({
      message: 'Surat tugas berhasil dibuat',
      data: {
        ...result.surat.toJSON(),
        tujuan: result.tujuan.map((item) => item.toJSON()),
      },
      drive_file: req.file?.drive || null,
    });
  } catch (err) {
    if (!err.status || err.status >= 500) {
      console.error('Error createSuratTugas:', err);
    }
    res.status(err.status || 500).json({
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
  }
};

/* ================= GET ALL ================= */
const getAll = async (req, res) => {
  try {
    const { user_id } = req.query;
    console.log('📥 GET ALL - user_id dari query:', user_id);
    console.log('👤 User yang login:', req.user?.id, req.user?.role);
    
    let whereCondition = {};
    
    // Jika ada parameter user_id, filter berdasarkan user_id
    if (user_id) {
      whereCondition.user_id = user_id;
      console.log('🔍 Filter berdasarkan user_id dari query:', user_id);
    }
    
    // Jika user adalah pegawai biasa, paksa filter berdasarkan ID mereka sendiri
    if (req.user && req.user.role === 'pegawai') {
      whereCondition.user_id = req.user.id;
      console.log('👤 User adalah pegawai, memfilter untuk user_id:', req.user.id);
    }
    
    console.log('🔍 Where condition:', JSON.stringify(whereCondition));
    
    const data = await SuratTugas.findAll({
      where: whereCondition,
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'nama', 'nip', 'role', 'unit_kerja'] 
        },
        { 
          model: Daerah, 
          as: 'daerah', 
          attributes: ['id', 'nama_daerah', 'latitude', 'longitude', 'radius'] 
        },
      ],
      order: [['tanggal_mulai', 'DESC']],
    });

    console.log(`✅ Ditemukan ${data.length} surat tugas`);
    
    res.json(data);
  } catch (err) {
    console.error('❌ Error di getAll:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET BY ID ================= */
const getById = async (req, res) => {
  try {
    const data = await SuratTugas.findByPk(req.params.id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'nama', 'nip', 'role', 'unit_kerja'] 
        },
        { 
          model: Daerah, 
          as: 'daerah', 
          attributes: ['id', 'nama_daerah', 'latitude', 'longitude', 'radius'] 
        },
      ]
    });
    
    if (!data) {
      return res.status(404).json({ message: 'Tidak ditemukan' });
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error getById:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET AKTIF ================= */
const getAktifByPegawai = async (req, res) => {
  try {
    const result = await resolveActiveAssignment(req.user.id);
    if (!result) {
      return res.status(404).json({
        message: 'Tidak ada surat tugas aktif hari ini',
      });
    }

    const data = result.surat.toJSON();
    res.json({
      ...data,
      tujuan: data.tujuan || [],
      tujuan_aktif: typeof result.tujuanAktif.toJSON === 'function'
        ? result.tujuanAktif.toJSON()
        : result.tujuanAktif,
      tanggal_server: result.tanggalServer,
      timezone: BUSINESS_TIMEZONE,
    });
  } catch (err) {
    if (err.code === 'ACTIVE_ASSIGNMENT_CONFLICT') {
      return res.status(409).json({
        message: err.message,
        code: err.code,
        assignment_ids: err.assignmentIds,
      });
    }
    console.error('Error getAktifByPegawai:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET BY USER ID (ENDPOINT KHUSUS) ================= */
const getByUserId = async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log('📥 GET BY USER ID - user_id:', user_id);
    console.log('👤 User yang login:', req.user?.id, req.user?.role);
    
    // Validasi: user biasa hanya bisa melihat data sendiri
    if (req.user.role === 'pegawai' && req.user.id != user_id) {
      return res.status(403).json({ 
        success: false,
        message: 'Anda tidak berhak melihat data pegawai lain' 
      });
    }
    
    const data = await SuratTugas.findAll({
      where: { user_id: user_id },
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['id', 'nama', 'nip', 'role', 'unit_kerja'] 
        },
        { 
          model: Daerah, 
          as: 'daerah', 
          attributes: ['id', 'nama_daerah', 'latitude', 'longitude', 'radius'] 
        },
      ],
      order: [['tanggal_mulai', 'DESC']],
    });

    console.log(`✅ Ditemukan ${data.length} surat tugas untuk user ${user_id}`);
    
    res.json({
      success: true,
      data: data,
      total: data.length,
      user_id: user_id
    });
  } catch (err) {
    console.error('❌ Error di getByUserId:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

/* ================= UPDATE ================= */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nomor_surat,
      user_id,
      daerah_id,
      tanggal_mulai,
      tanggal_selesai,
      nama_kegiatan,
      pembebanan_biaya,
      tujuan_kegiatan,
    } = req.body;

    const result = await sequelize.transaction(async (transaction) => {
      const surat = await SuratTugas.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!surat) {
        const error = new Error('Surat tugas tidak ditemukan');
        error.status = 404;
        throw error;
      }

      const rawTujuan = Object.prototype.hasOwnProperty.call(req.body, 'tujuan')
        ? parseTujuanField(req.body.tujuan)
        : [{
            daerah_id: daerah_id ?? surat.daerah_id,
            tanggal_mulai: tanggal_mulai ?? surat.tanggal_mulai,
            tanggal_selesai: tanggal_selesai ?? surat.tanggal_selesai,
          }];
      const preparedTujuan = await prepareTujuan(rawTujuan, transaction);
      const firstTujuan = preparedTujuan[0];
      const lastTujuan = preparedTujuan[preparedTujuan.length - 1];

      const presensiRows = await Presensi.findAll({
        where: { surat_tugas_id: surat.id },
        attributes: ['id', 'tanggal_presensi'],
        transaction,
      });
      const unmappedPresence = presensiRows.find((presensi) =>
        !preparedTujuan.some((item) => isDateWithin(
          presensi.tanggal_presensi,
          item.tanggal_mulai,
          item.tanggal_selesai
        ))
      );
      if (unmappedPresence) {
        const error = new Error(
          `Jadwal baru tidak mencakup presensi tanggal ${unmappedPresence.tanggal_presensi}.`
        );
        error.status = 409;
        error.code = 'SCHEDULE_HAS_PRESENCE';
        throw error;
      }

      await surat.update({
        nomor_surat,
        user_id,
        daerah_id: firstTujuan.daerah_id,
        daerah_tujuan: firstTujuan.daerah_tujuan,
        latitude: firstTujuan.latitude,
        longitude: firstTujuan.longitude,
        radius: firstTujuan.radius,
        tanggal_mulai: firstTujuan.tanggal_mulai,
        tanggal_selesai: lastTujuan.tanggal_selesai,
        nama_kegiatan,
        pembebanan_biaya,
        tujuan_kegiatan,
      }, { transaction });

      const tujuan = await replaceTujuan({
        surat,
        tujuan: preparedTujuan,
        transaction,
      });

      await Notifikasi.create({
        user_id: surat.user_id,
        judul: 'Perubahan Surat Tugas',
        pesan: `Surat tugas "${surat.nama_kegiatan || 'tidak bernama'}" telah diperbarui`,
        is_read: false,
      }, { transaction });

      return { surat, tujuan };
    });

    res.json({ 
      message: 'Surat tugas berhasil diperbarui',
      data: {
        ...result.surat.toJSON(),
        tujuan: result.tujuan.map((item) => item.toJSON()),
      },
    });
  } catch (err) {
    if (!err.status || err.status >= 500) {
      console.error('Error updateSuratTugas:', err);
    }
    res.status(err.status || 500).json({
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
  }
};

/* ================= DELETE ================= */
const remove = async (req, res) => {
  try {
    const surat = await SuratTugas.findByPk(req.params.id);
    if (!surat) {
      return res.status(404).json({ message: 'Surat tugas tidak ditemukan' });
    }

    await surat.destroy();
    res.json({ message: 'Surat tugas berhasil dihapus' });
  } catch (err) {
    console.error('Error remove:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ================= GET DASHBOARD STATS ================= */
const getDashboardStats = async (req, res) => {
  try {
    const totalSurat = await SuratTugas.count();
    const suratAktif = await SuratTugas.count({ where: { status: 'AKTIF' } });
    const suratSelesai = await SuratTugas.count({ where: { status: 'SELESAI' } });
    
    // Statistik berdasarkan user yang login
    const userStats = await SuratTugas.count({ 
      where: { user_id: req.user.id } 
    });
    
    res.json({
      total: totalSurat,
      aktif: suratAktif,
      selesai: suratSelesai,
      user_total: userStats
    });
  } catch (err) {
    console.error('Error getDashboardStats:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createSuratTugas,
  getAll,
  getById,
  getAktifByPegawai,
  getByUserId,
  update,
  remove,
  getDashboardStats
};
