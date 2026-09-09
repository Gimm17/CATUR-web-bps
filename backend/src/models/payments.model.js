// models/payments.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const LaporanPerjalanan = require('./laporan.perjalanan');

const Payments = sequelize.define(
  'Payments',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    
    laporan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    
    nominal: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    
    status: {
      type: DataTypes.ENUM('menunggu', 'diproses', 'selesai'),
      defaultValue: 'menunggu',
    },
    
    bukti_transfer: DataTypes.STRING,
    tanggal_transfer: DataTypes.DATE,
    catatan: DataTypes.TEXT,
  },
  {
    tableName: 'payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Payments.belongsTo(LaporanPerjalanan, {
  foreignKey: 'laporan_id',
  as: 'laporan',
});

module.exports = Payments;