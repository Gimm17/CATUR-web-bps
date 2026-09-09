const bcrypt = require('bcryptjs'); // Ganti bcrypt dengan bcryptjs
const User = require('../models/user.model');

/**
 * GET PROFIL USER LOGIN
 */
exports.getProfil = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'nama', 'password', 'email', 'role', 'nip', 'alamat', 'telepon', 'unit_kerja'],
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE NAMA PROFIL
 */
exports.updateProfil = async (req, res) => {
  const { nama } = req.body;

  try {
    await User.update(
      { nama },
      { where: { id: req.user.id } }
    );

    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GANTI PASSWORD
 */
exports.updatePassword = async (req, res) => {
  const { password_lama, password_baru } = req.body;

  try {
    const user = await User.findByPk(req.user.id);

    const isMatch = bcrypt.compareSync(password_lama, user.password); // Ganti dengan compareSync
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: 'Password lama salah' });
    }

    const hashed = bcrypt.hashSync(password_baru, 10); // Ganti dengan hashSync

    await User.update(
      { password: hashed },
      { where: { id: req.user.id } }
    );

    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Dapatkan Semua Pengguna
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nama', 'email', 'role', 'nip', 'alamat', 'telepon', 'unit_kerja'],
      order: [['id', 'ASC']],
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * CREATE USER (ADMIN)
 */
exports.createUser = async (req, res) => {
  try {
    const { nama, email, password, role, nip, alamat, telepon, unit_kerja } = req.body;

    if (!nama || !email || !password || !role) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: 'Email sudah digunakan' });
    }

    const hashed = bcrypt.hashSync(password, 10); // Ganti dengan hashSync

    const user = await User.create({
      nama,
      email,
      password: hashed,
      role,
      nip,
      alamat,
      telepon,
      unit_kerja
    });

    res.json({
      message: 'User berhasil ditambahkan',
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        nip: user.nip,
        alamat: user.alamat,
        telepon: user.telepon,
        unit_kerja: user.unit_kerja,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * UPDATE USER (ADMIN)
 */
/**
 * UPDATE USER (ADMIN) - YANG SUDAH DIPERBAIKI
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, email, role, nip, alamat, telepon, unit_kerja, password } = req.body;

    // Validasi ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'ID user tidak valid' });
    }

    // Cari user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Validasi data wajib
    if (!nama || !email || !role) {
      return res.status(400).json({ 
        message: 'Nama, email, dan role harus diisi' 
      });
    }

    // CEK EMAIL SUDAH DIGUNAKAN USER LAIN (YANG BENAR)
    if (email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { email },
        attributes: ['id']
      });
      
      // CEK APAKAH EMAIL SUDAH DIPAKAI USER LAIN (BUKAN USER INI SENDIRI)
      if (existingUser && existingUser.id !== parseInt(id)) {
        return res.status(400).json({ message: 'Email sudah digunakan user lain' });
      }
    }

    // Siapkan data update
    const updateData = {
      nama,
      email,
      role,
      nip: nip || null,
      alamat: alamat || null,
      telepon: telepon || null,
      unit_kerja: unit_kerja || null
    };

    // Jika password diisi, hash
    if (password && password.trim() !== "") {
      // Validasi password minimal 6 karakter
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password minimal 6 karakter' });
      }
      
      updateData.password = bcrypt.hashSync(password, 10);
    }

    // Update user
    await User.update(updateData, { where: { id } });

    res.json({ 
      message: 'User berhasil diperbarui'
    });

  } catch (err) {
    console.error('Error updateUser:', err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

/**
 * DELETE USER (ADMIN)
 */
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id || req.body.id || req.query.id;

    if (!userId || Number.isNaN(Number(userId))) {
      return res.status(400).json({ message: 'ID user tidak valid' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    await user.destroy();
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        message: 'User tidak bisa dihapus karena masih terkait data lain',
      });
    }

    res.status(500).json({ message: err.message });
  }
};
