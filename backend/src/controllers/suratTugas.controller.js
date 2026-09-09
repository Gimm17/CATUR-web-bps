const SuratTugas = require('../models/suratTugas.model');
const Daerah = require('../models/daerah.model');
const Notifikasi = require('../models/notifikasi.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');

function hasValidZone(daerah) {
  if (!daerah) return false;

  if (daerah.geojson) return true;

  const latitude = Number(daerah.latitude);
  const longitude = Number(daerah.longitude);
  const radius = Number(daerah.radius);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Number.isFinite(radius) &&
    radius > 0
  );
}

function getZoneUnavailableMessage() {
  return 'Area daerah belum tersedia. Gunakan GeoJSON atau atur titik koordinat dan radius terlebih dahulu.';
}

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

    const daerah = await Daerah.findByPk(daerah_id);
    if (!daerah) {
      return res.status(404).json({ message: 'Daerah tidak ditemukan' });
    }
    if (!hasValidZone(daerah)) {
      return res.status(400).json({ message: getZoneUnavailableMessage() });
    }

    const surat = await SuratTugas.create({
      nomor_surat,
      user_id,
      daerah_id,
      daerah_tujuan: daerah.nama_daerah,
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: Number(daerah.radius) > 0 ? Number(daerah.radius) : 0,
      tanggal_mulai,
      tanggal_selesai,
      nama_kegiatan,
      pembebanan_biaya,
      tujuan_kegiatan,
      status: 'AKTIF',
      file_surat: req.file
        ? (req.file.drive?.webContentLink || req.file.drive?.webViewLink || null)
        : null,
    });

    // Buat notifikasi
    await Notifikasi.create({
      user_id,
      judul: 'Surat Tugas Baru',
      pesan: `Anda mendapat surat tugas untuk kegiatan: ${nama_kegiatan} di ${daerah.nama_daerah}`,
      is_read: false,
    });

    res.status(201).json({
      message: 'Surat tugas berhasil dibuat',
      data: surat,
      drive_file: req.file?.drive || null,
    });
  } catch (err) {
    console.error('Error createSuratTugas:', err);
    res.status(500).json({ message: err.message });
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
    const data = await SuratTugas.findOne({
      where: {
        user_id: req.user.id,
        status: 'AKTIF',
      },
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
      order: [['id', 'DESC']],
    });

    if (!data) {
      return res.status(404).json({ message: 'Tidak ada surat tugas aktif' });
    }

    res.json(data);
  } catch (err) {
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

    const surat = await SuratTugas.findByPk(id);
    if (!surat) {
      return res.status(404).json({ message: 'Surat tugas tidak ditemukan' });
    }

    let updateData = {
      nomor_surat,
      user_id,
      daerah_id,
      tanggal_mulai,
      tanggal_selesai,
      nama_kegiatan,
      pembebanan_biaya,
      tujuan_kegiatan,
    };

    let daerahBaru = null;

    // Jika daerah diganti → ambil ulang koordinat
    if (daerah_id && daerah_id != surat.daerah_id) {
      daerahBaru = await Daerah.findByPk(daerah_id);
      if (!daerahBaru) {
        return res.status(404).json({ message: 'Daerah tidak ditemukan' });
      }
      if (!hasValidZone(daerahBaru)) {
        return res.status(400).json({ message: getZoneUnavailableMessage() });
      }

      updateData = {
        ...updateData,
        daerah_tujuan: daerahBaru.nama_daerah,
        latitude: daerahBaru.latitude,
        longitude: daerahBaru.longitude,
        radius: Number(daerahBaru.radius) > 0 ? Number(daerahBaru.radius) : 0,
      };
    }

    await surat.update(updateData);

    // Notifikasi
    await Notifikasi.create({
      user_id: surat.user_id,
      judul: 'Perubahan Surat Tugas',
      pesan: `Surat tugas "${surat.nama_kegiatan || 'tidak bernama'}" telah diperbarui`,
      is_read: false,
    });

    res.json({ 
      message: 'Surat tugas berhasil diperbarui',
      data: surat 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
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
