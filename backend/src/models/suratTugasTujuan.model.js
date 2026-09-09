const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Daerah = require('./daerah.model');

const SuratTugasTujuan = sequelize.define(
  'surat_tugas_tujuan',
  {
    surat_tugas_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    daerah_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    urutan: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    daerah_tujuan: {
      type: DataTypes.STRING(255),
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
    radius: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    tanggal_mulai: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    tanggal_selesai: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: 'surat_tugas_tujuan',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        name: 'uq_surat_tugas_tujuan_order',
        fields: ['surat_tugas_id', 'urutan'],
      },
      {
        name: 'ix_surat_tugas_tujuan_active',
        fields: ['surat_tugas_id', 'tanggal_mulai', 'tanggal_selesai'],
      },
    ],
  }
);

SuratTugasTujuan.belongsTo(Daerah, {
  foreignKey: 'daerah_id',
  as: 'daerah',
});

module.exports = SuratTugasTujuan;
