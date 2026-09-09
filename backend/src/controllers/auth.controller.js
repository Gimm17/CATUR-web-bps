const authService = require('../services/auth.service');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email dan password wajib diisi'
      });
    }

    const result = await authService.login(email, password);
    if (!result) {
      return res.status(401).json({
        message: 'Email atau password salah'
      });
    }

    const { token, user } = result;

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        nip: user.nip,
        alamat: user.alamat,
        telepon: user.telepon,
        unit_kerja: user.unit_kerja
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// REGISTER USER BARU
exports.register = async (req, res) => {
  try {
    const { nama, email, password, role, nip, alamat, telepon, unit_kerja,  created_by } = req.body;


    const user = await authService.register({
      nama,
      email,
      password,
      role,
      nip, 
      alamat, 
      telepon, 
      unit_kerja,  
      created_by
    });

    res.status(201).json({
      message: 'User berhasil dibuat',
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        nip: user.nip,
        alamat: user.alamat,
        telepon: user.telepon,
        unit_kerja: user.unit_kerja
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
