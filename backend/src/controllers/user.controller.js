const User = require('../models/user.model');

// Fungsi untuk mendapatkan semua pegawai
exports.getPegawai = async (req, res) => {
  try {
    const pegawai = await User.findAll({
      where: {
        role: 'pegawai',
      },
      attributes: ['id', 'nama', 'role', 'nip', 'alamat', 'telepon', 'unit_kerja' ],
      order: [['nama', 'ASC']],
    });

    res.json(pegawai);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fungsi untuk mendapatkan semua pengguna
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'nama', 'role', 'nip', 'alamat', 'telepon', 'unit_kerja'],
      order: [['nama', 'ASC']],
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fungsi untuk mendapatkan pengguna berdasarkan ID
exports.getUserById = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'nama', 'email', 'role',"nip", "alamat", "telepon", "unit_kerja"],
    });

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Menghitung Jumlah Pegawai
exports.getPegawaiCount = async (req, res) => {
  try {
    const count = await User.count({
      where: {
        role: 'pegawai',
      },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};