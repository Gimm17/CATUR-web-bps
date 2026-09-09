const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');
const SuratTugas = require('./suratTugas.model');

const Presensi = sequelize.define(
  'presensi',
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    surat_tugas_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
    },
    foto: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    laporan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tanggal_presensi: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    jam_presensi: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: 'presensi',
    timestamps: false,
  }
);

// Relasi
Presensi.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Presensi.belongsTo(SuratTugas, { foreignKey: 'surat_tugas_id', as: 'surat_tugas' });

module.exports = Presensi;