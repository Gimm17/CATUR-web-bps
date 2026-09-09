const bcrypt = require('bcryptjs'); // Ganti bcrypt dengan bcryptjs
const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/user.repository');

const login = async (email, password) => {
  const user = await userRepo.findByEmail(email);
  if (!user) return null;

  const isValid = bcrypt.compareSync(password, user.password); // Gunakan compareSync dari bcryptjs
  if (!isValid) return null;

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { token, user };
};

const register = async ({ nama, email, password, role, nip, alamat, telepon, unit_kerja,  created_by }) => {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw new Error('Email sudah terdaftar');
  }

  const hashedPassword = bcrypt.hashSync(password, 10); // Gunakan hashSync dari bcryptjs

  const user = await userRepo.createUser({
    nama,
    email,
    password: hashedPassword,
    role: role || 'pegawai',
    nip, alamat, telepon, unit_kerja, 
    created_by: created_by || null
  });

  return user;
};

module.exports = { login, register };