const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');
const Daerah = require('./daerah.model');

const SuratTugas = sequelize.define('surat_tugas', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nomor_surat: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  file_surat: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  daerah_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  daerah_tujuan: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DECIMAL(10,6),
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DECIMAL(10,6),
    allowNull: false,
  },
  radius: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tanggal_mulai: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  tanggal_selesai: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  nama_kegiatan: {          // Kolom baru
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Nama kegiatan tidak boleh kosong'
      },
      len: {
        args: [3, 200],
        msg: 'Nama kegiatan harus 3-200 karakter'
      }
    }
  },
  pembebanan_biaya: {       // Kolom baru
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  tujuan_kegiatan: {        // Kolom baru
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'AKTIF',
  },
}, {
  tableName: 'surat_tugas',
  timestamps: true,          // Tambah created_at dan updated_at
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

SuratTugas.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

SuratTugas.belongsTo(Daerah, {
  foreignKey: 'daerah_id',
  as: 'daerah',
});

module.exports = SuratTugas;
