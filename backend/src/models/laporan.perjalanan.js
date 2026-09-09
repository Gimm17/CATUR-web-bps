// models/laporan.perjalanan.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user.model');
const SuratTugas = require('./suratTugas.model');

const LaporanPerjalanan = sequelize.define(
  'LaporanPerjalanan',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    surat_tugas_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    pegawai_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    kesimpulan: DataTypes.TEXT,

    status: {
      type: DataTypes.ENUM(
        'dikirim',          // Pegawai kirim laporan
        'dicek_keuangan',   // Keuangan cek
        'disetujui_keuangan', // Keuangan setujui
        'ditandatangani',   // Atasan tanda tangan
        'pencairan_dana',   // Dana sedang dicairkan
        'dana_turun'        // Dana sudah turun
      ),
      defaultValue: 'dikirim',
    },

    file_pdf: DataTypes.STRING,
    file_pdf_signed: DataTypes.STRING,
    file_word: DataTypes.STRING,

    tanggal_kirim: DataTypes.DATE,
    tanggal_acc: DataTypes.DATE,
    tanggal_ttd: DataTypes.DATE, // Tambah field untuk tanggal tanda tangan

    // ===== ATASAN =====
    nama_atasan: DataTypes.STRING,
    jabatan_atasan: DataTypes.STRING,
    nip_atasan: DataTypes.STRING,
    ttd_path: DataTypes.STRING, // Path tanda tangan digital atasan

    // ===== PEGAWAI ===== (BARU)
    ttd_pegawai: DataTypes.STRING, // Path tanda tangan digital pegawai
    tanggal_ttd_pegawai: DataTypes.DATE, // Tanggal tanda tangan pegawai

    // ===== KEUANGAN =====
    nominal_dana: DataTypes.BIGINT,
    catatan_keuangan: DataTypes.TEXT,
    tanggal_verifikasi_keuangan: DataTypes.DATE,

    // ===== PEMBAYARAN =====
    bukti_transfer: DataTypes.STRING,
    tanggal_transfer: DataTypes.DATE,
    status_pembayaran: {
      type: DataTypes.ENUM('menunggu', 'diproses', 'selesai'),
      defaultValue: 'menunggu'
    }
  },
  {
    tableName: 'laporan_perjalanan',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

/* RELASI */
LaporanPerjalanan.belongsTo(SuratTugas, {
  foreignKey: 'surat_tugas_id',
  as: 'surat_tugas',
});

LaporanPerjalanan.belongsTo(User, {
  foreignKey: 'pegawai_id',
  as: 'user',
});

module.exports = LaporanPerjalanan;
