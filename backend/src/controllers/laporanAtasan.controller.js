// controllers/laporanAtasan.controller.js
const LaporanPerjalanan = require('../models/laporan.perjalanan');
const SuratTugas = require('../models/suratTugas.model');
const User = require('../models/user.model');
const Notifikasi = require('../models/notifikasi.model');
const signLaporanPDF = require('../utils/pdfSigner');
const { uploadFileToDrive } = require('../utils/googleDrive');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

// GET: Laporan yang sudah disetujui keuangan (siap untuk ditandatangani)
exports.getDaftarLaporan = async (req, res) => {
  try {
    const laporan = await LaporanPerjalanan.findAll({
      where: {
        status: {
          [Op.in]: ['disetujui_keuangan', 'ditandatangani'],
        },
      },
      include: [
        {
          model: SuratTugas,
          as: 'surat_tugas',
        },
        {
          model: User,
          as: 'user',
          attributes: ['nama', 'nip'],
        },
      ],
      order: [
        ['status', 'ASC'],
        ['tanggal_verifikasi_keuangan', 'DESC'],
        ['tanggal_kirim', 'DESC'],
        ['updated_at', 'DESC'],
      ],
    });

    res.json(laporan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// GET: Semua laporan untuk monitoring
exports.getlaporanPegawai = async (req, res) => {
  try {
    const data = await LaporanPerjalanan.findAll({
      include: [
        {
          model: SuratTugas,
          as: 'surat_tugas',
          attributes: ['nomor_surat', 'tanggal_mulai', 'tanggal_selesai', 'daerah_tujuan'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['nama', 'nip'],
        },
      ],
      order: [['id', 'DESC']],
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST: Tanda tangan laporan
exports.approveLaporan = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_atasan, jabatan_atasan, nip_atasan } = req.body;
    const finalNipAtasan = (nip_atasan || '196707041986031001').toString().trim();

    if (!req.file) {
      return res.status(400).json({ message: 'Tanda tangan wajib diupload' });
    }

    const laporan = await LaporanPerjalanan.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'user', 
          attributes: ['nama', 'nip'] 
        },
        {
          model: SuratTugas,
          as: 'surat_tugas'
        }
      ]
    });

    if (!laporan) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' });
    }

    if (laporan.status !== 'disetujui_keuangan') {
      return res.status(400).json({ 
        message: 'Laporan belum disetujui keuangan' 
      });
    }

    // Sumber file PDF asli (URL Drive atau file lokal lama)
    const pdfSource = isHttpUrl(laporan.file_pdf)
      ? laporan.file_pdf
      : path.join(__dirname, '../../uploads/pdf', laporan.file_pdf);
    
    // Tambahkan tanda tangan ke PDF
    const signedPdf = await signLaporanPDF({
      existingPdfPath: pdfSource,
      signatureSource: req.file.drive?.webContentLink || req.file.drive?.webViewLink || req.file.path,
      pegawai: laporan.user,
      surat: laporan.surat_tugas || {},
      atasan: {
        nama: nama_atasan,
        jabatan: jabatan_atasan,
        nip: finalNipAtasan
      },
      kesimpulan: laporan.kesimpulan || '',
    });
    const signedPdfFileName = path.basename(signedPdf);
    const driveSignedPdf = await uploadFileToDrive({
      filePath: signedPdf,
      fileName: signedPdfFileName,
      mimeType: 'application/pdf',
      subfolderPath: 'pdf/signed',
    });

    // Update status laporan
    laporan.status = 'ditandatangani';
    laporan.file_pdf_signed = driveSignedPdf?.webContentLink || driveSignedPdf?.webViewLink || signedPdfFileName;
    laporan.nama_atasan = nama_atasan;
    laporan.jabatan_atasan = jabatan_atasan;
    laporan.nip_atasan = finalNipAtasan;
    laporan.ttd_path = req.file.drive?.webContentLink || req.file.drive?.webViewLink || null;
    laporan.tanggal_ttd = new Date();
    await laporan.save();

    try {
      await Notifikasi.create({
        user_id: laporan.pegawai_id,
        judul: 'Laporan Ditandatangani Atasan',
        pesan: 'Laporan perjalanan dinas Anda telah ditandatangani oleh pimpinan.',
        is_read: false,
      });
    } catch (notifyErr) {
      console.error('Gagal membuat notifikasi:', notifyErr.message);
    }

    if (fs.existsSync(signedPdf)) {
      fs.unlinkSync(signedPdf);
    }

    res.json({ 
      message: 'Laporan berhasil ditandatangani', 
      file: laporan.file_pdf_signed,
      status: laporan.status,
      drive_signature_file: req.file.drive || null,
      drive_signed_pdf: driveSignedPdf,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
