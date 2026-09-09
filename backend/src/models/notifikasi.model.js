const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notifikasi = sequelize.define(
  'Notifikasi',
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    judul: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pesan: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'notifikasi',
    timestamps: false,
  }
);

module.exports = Notifikasi;
