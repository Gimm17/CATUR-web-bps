const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  nama: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'pegawai'
  },
  nip: {  // Menambahkan kolom NIP
    type: DataTypes.STRING(20),  // Atur panjang maksimal karakter
    allowNull: true  // Sesuaikan, bisa juga false jika NIP harus diisi
  },
  alamat: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  telepon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit_kerja: {
    type: DataTypes.STRING,
    allowNull: true
},}, {
  tableName: 'users',
  timestamps: false
});

module.exports = User;