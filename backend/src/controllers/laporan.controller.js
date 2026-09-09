const SuratTugas = require('../models/suratTugas.model');
const Presensi = require('../models/presensi.model');
const User = require('../models/user.model');
const LaporanPerjalanan = require('../models/laporan.perjalanan');
const generateLaporanPDF = require('../utils/pdfGenerator');
const generateLaporanWord = require('../utils/wordGenerator');
const appendBuktiPagesToSignedPDF = require('../utils/pdfAppendBukti');
const { uploadFileToDrive } = require('../utils/googleDrive');
const { getTodayDate } = require('../utils/date');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function parseFotoList(fotoValue) {
  if (!fotoValue) return [];

  if (Array.isArray(fotoValue)) {
    return fotoValue.filter(Boolean).map(String);
  }

  if (typeof fotoValue === 'string') {
    const trimmed = fotoValue.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
      } catch (err) {
        // ignore
      }
    }

    return [trimmed];
  }

  return [];
}

function normalizePresensiPhotos(presensiList = []) {
  const list = Array.isArray(presensiList) ? presensiList : [];
  return list.map((p) => {
    const obj = typeof p?.toJSON === 'function' ? p.toJSON() : p;
    const fotoList = parseFotoList(obj?.foto);
    return {
      ...obj,
      foto: fotoList[0] || null,
      foto_list: fotoList,
    };
  });
}

function normalizeBuktiPembayaranFiles(files = []) {
  return files.map((file) => {
    const url = file.drive?.webContentLink || file.drive?.webViewLink || file.filename;
    return {
      name: file.originalname || file.filename,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      url,
      uploaded_at: new Date().toISOString(),
    };
  });
}

function getBuktiDir() {
  const dir = path.join(__dirname, '../../uploads/bukti-nota-pembayaran');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getBuktiManifestPath(userId, suratId) {
  const safeUser = String(userId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSurat = String(suratId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(getBuktiDir(), `manifest-${safeUser}-${safeSurat}.json`);
}

function readBuktiManifest(userId, suratId) {
  const manifestPath = getBuktiManifestPath(userId, suratId);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeBuktiManifest(userId, suratId, records = []) {
  const manifestPath = getBuktiManifestPath(userId, suratId);
  fs.writeFileSync(manifestPath, JSON.stringify(records, null, 2), 'utf8');
}

function deleteLocalBuktiFile(fileRef = '') {
  if (!fileRef || typeof fileRef !== 'string') return;
  if (isHttpUrl(fileRef)) return;

  const candidates = [
    path.join(process.cwd(), 'uploads/bukti-nota-pembayaran', fileRef),
    path.join(__dirname, '../../uploads/bukti-nota-pembayaran', fileRef),
    fileRef
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
        break;
      }
    } catch (err) {
      // lanjut ke candidate berikutnya
    }
  }
}

async function findPreferredSuratForUser(userId) {
  const today = getTodayDate();

  const suratAktif = await SuratTugas.findOne({
    where: {
      user_id: userId,
      status: 'AKTIF',
      tanggal_mulai: { [Op.lte]: today },
      tanggal_selesai: { [Op.gte]: today },
    },
    order: [['tanggal_mulai', 'ASC'], ['created_at', 'DESC']],
  });

  if (suratAktif) {
    return suratAktif;
  }

  return SuratTugas.findOne({
    where: { user_id: userId },
    order: [['created_at', 'DESC']],
  });
}

/* ===============================
   GET LAPORAN BY SURAT (PEGAWAI)
================================ */
exports.getLaporanBySuratId = async (req, res) => {
  try {
    const userId = req.user.id;
    const suratId = req.params.id;

    if (!suratId) {
      return res.status(400).json({ message: 'ID surat tugas wajib diisi' });
    }

    const laporan = await LaporanPerjalanan.findAll({
      where: {
        surat_tugas_id: suratId,
        pegawai_id: userId,
      },
      include: [
        {
          model: SuratTugas,
          as: 'surat_tugas',
          attributes: ['id', 'nomor_surat', 'daerah_tujuan', 'tanggal_mulai', 'tanggal_selesai', 'file_surat'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'email'],
        },
      ],
      order: [
        ['tanggal_kirim', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });

    return res.json(laporan);
  } catch (err) {
    console.error('Error getLaporanBySuratId:', err);
    return res.status(500).json({
      message: 'Gagal mengambil laporan berdasarkan surat',
      error: err.message,
    });
  }
};

/* ===============================
   GET LAPORAN PERJALANAN
================================ */
exports.getLaporanPerjalanan = async (req, res) => {
  try {
    const userId = req.user.id;

    const surat = await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        message: 'Surat tugas tidak ditemukan',
      });
    }

    const user = await User.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Data pegawai tidak ditemukan',
      });
    }

    const presensi = await Presensi.findAll({
      where: {
        user_id: userId,
        surat_tugas_id: surat.id,
        tanggal_presensi: {
          [Op.between]: [
            surat.tanggal_mulai,
            surat.tanggal_selesai,
          ],
        },
      },
      order: [['tanggal_presensi', 'ASC']],
    });

    // Mencari laporan akhir atau draft
    const laporanAkhir = await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nama', 'nip', 'email', 'role', 'unit_kerja']
        }
      ]
    });

    // Tambahkan informasi pembayaran jika ada
    let pembayaran = null;
    if (laporanAkhir) {
      pembayaran = {
        status: laporanAkhir.status_pembayaran,
        nominal: laporanAkhir.nominal_dana,
        bukti_transfer: laporanAkhir.bukti_transfer,
        tanggal_transfer: laporanAkhir.tanggal_transfer
      };
    }

    const buktiPembayaran = readBuktiManifest(userId, surat.id);

    res.json({
      user: user,
      surat_tugas: surat,
      presensi: normalizePresensiPhotos(presensi),
      laporan_akhir: laporanAkhir,
      pembayaran,
      bukti_pembayaran: buktiPembayaran
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   UPLOAD TANDA TANGAN PEGAWAI (INDEPENDENT)
   Bisa upload TTD sebelum ada laporan
================================ */
exports.uploadTTDPegawai = async (req, res) => {
  try {
    const userId = req.user.id;

    // Validasi file
    if (!req.file) {
      return res.status(400).json({
        message: 'File tanda tangan diperlukan'
      });
    }

    // Cari surat tugas aktif user
    const surat = await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        message: 'Surat tugas tidak ditemukan'
      });
    }

    // Cek apakah sudah ada laporan atau draft
    let existingLaporan = await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      }
    });

    if (existingLaporan) {
      // Jika sudah ada laporan/draft, update TTD
      
      // Hapus file lama jika ada
      if (existingLaporan.ttd_pegawai && !isHttpUrl(existingLaporan.ttd_pegawai)) {
        const oldFilePath = path.join(__dirname, '../../uploads/ttd', existingLaporan.ttd_pegawai);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      await existingLaporan.update({
        ttd_pegawai: req.file.drive?.webContentLink || req.file.drive?.webViewLink || null,
        tanggal_ttd_pegawai: new Date()
      });

    } else {
      // Jika belum ada, buat record baru dengan status draft
      existingLaporan = await LaporanPerjalanan.create({
        pegawai_id: userId,
        surat_tugas_id: surat.id,
        ttd_pegawai: req.file.drive?.webContentLink || req.file.drive?.webViewLink || null,
        tanggal_ttd_pegawai: new Date(),
        status: 'draft',
        kesimpulan: '' // Kosongkan kesimpulan
      });
    }

    res.json({
      success: true,
      message: 'Tanda tangan berhasil diupload',
      data: {
        ttd_pegawai: req.file.drive?.webContentLink || req.file.drive?.webViewLink || null,
        tanggal_ttd_pegawai: new Date(),
        drive_file: req.file.drive || null,
      }
    });

  } catch (err) {
    console.error(err);
    
    // Hapus file yang sudah terupload jika terjadi error
    if (req.file && req.file.path) {
      const filePath = path.join(__dirname, '../../uploads/ttd', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

/* ===============================
   UPLOAD BUKTI PEMBAYARAN/NOTA PEGAWAI
================================ */
exports.validateUploadBuktiPembayaran = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const surat = await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        success: false,
        message: 'Surat tugas tidak ditemukan',
      });
    }

    const existingLaporan = await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      }
    });

    const allowedStatuses = ['draft', 'dikirim', 'dicek_keuangan'];
    if (!existingLaporan || !allowedStatuses.includes(existingLaporan.status)) {
      return res.status(400).json({
        success: false,
        message: 'Upload nota dinas hanya bisa dilakukan sebelum disetujui keuangan',
      });
    }

    req.currentSurat = surat;
    req.currentLaporan = existingLaporan;
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.uploadBuktiPembayaran = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File bukti pembayaran/nota diperlukan',
      });
    }

    const surat = req.currentSurat || await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        success: false,
        message: 'Surat tugas tidak ditemukan',
      });
    }

    const existingLaporan = req.currentLaporan || await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      }
    });

    if (!existingLaporan) {
      return res.status(404).json({
        success: false,
        message: 'Laporan perjalanan tidak ditemukan',
      });
    }

    const newFiles = normalizeBuktiPembayaranFiles(req.files);
    const oldFiles = readBuktiManifest(userId, surat.id);
    const mergedFiles = [...oldFiles, ...newFiles];
    writeBuktiManifest(userId, surat.id, mergedFiles);

    // Tidak mengubah struktur tabel; bukti disimpan di manifest file.
    // Jika laporan sudah ditandatangani, update versi signed.
    // Jika belum, update file_pdf (draft) agar tidak dianggap sudah ditandatangani.
    const hasSignedPdf = Boolean(existingLaporan.file_pdf_signed);
    const pdfSource = existingLaporan.file_pdf_signed || existingLaporan.file_pdf;
    let driveUpdatedPdf = null;
    if (pdfSource) {
      const sourcePath = isHttpUrl(pdfSource)
        ? pdfSource
        : path.join(__dirname, '../../uploads/pdf', pdfSource);

      const updatedPdfPath = await appendBuktiPagesToSignedPDF({
        existingPdfPath: sourcePath,
        buktiPembayaran: newFiles,
      });

      const updatedPdfFileName = path.basename(updatedPdfPath);
      driveUpdatedPdf = await uploadFileToDrive({
        filePath: updatedPdfPath,
        fileName: updatedPdfFileName,
        mimeType: 'application/pdf',
        subfolderPath: hasSignedPdf ? 'pdf/signed' : 'pdf',
      });

      const updatedUrl =
        driveUpdatedPdf?.webContentLink || driveUpdatedPdf?.webViewLink || updatedPdfFileName;

      if (hasSignedPdf) {
        existingLaporan.file_pdf_signed = updatedUrl;
      } else {
        existingLaporan.file_pdf = updatedUrl;
      }
      await existingLaporan.save();

      if (fs.existsSync(updatedPdfPath)) {
        fs.unlinkSync(updatedPdfPath);
      }
    }

    return res.json({
      success: true,
      message: 'Bukti pembayaran/nota berhasil diupload',
      data: {
        total: mergedFiles.length,
        bukti_pembayaran: mergedFiles,
        drive_signed_pdf: driveUpdatedPdf,
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ===============================
   GET BUKTI PEMBAYARAN/NOTA PEGAWAI
================================ */
exports.getBuktiPembayaran = async (req, res) => {
  try {
    const userId = req.user.id;

    const surat = await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        success: false,
        message: 'Surat tugas tidak ditemukan'
      });
    }

    return res.json({
      success: true,
      bukti_pembayaran: readBuktiManifest(userId, surat.id),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ===============================
   RESET BUKTI PEMBAYARAN/NOTA PEGAWAI
================================ */
exports.resetBuktiPembayaran = async (req, res) => {
  try {
    const userId = req.user.id;

    const surat = await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        success: false,
        message: 'Surat tugas tidak ditemukan'
      });
    }

    const existing = readBuktiManifest(userId, surat.id);

    for (const item of existing) {
      const fileName = item?.filename || '';
      const filePathOrUrl = item?.url || item?.file || item?.path || '';
      if (fileName) deleteLocalBuktiFile(fileName);
      if (filePathOrUrl) deleteLocalBuktiFile(filePathOrUrl);
    }

    writeBuktiManifest(userId, surat.id, []);

    return res.json({
      success: true,
      message: 'Bukti nota berhasil direset',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* ===============================
   GET TANDA TANGAN PEGAWAI
================================ */
exports.getTTDPegawai = async (req, res) => {
  try {
    const userId = req.user.id;

    // Cari surat tugas aktif
    const surat = await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        message: 'Surat tugas tidak ditemukan'
      });
    }

    // Cari laporan atau draft
    const laporan = await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      }
    });

    if (!laporan || !laporan.ttd_pegawai) {
      return res.status(404).json({
        message: 'Tanda tangan tidak ditemukan'
      });
    }

    // Path file tanda tangan
    if (isHttpUrl(laporan.ttd_pegawai)) {
      return res.redirect(laporan.ttd_pegawai);
    }

    const filePath = path.join(__dirname, '../../uploads/ttd', laporan.ttd_pegawai);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: 'File tanda tangan tidak ditemukan di server'
      });
    }

    res.sendFile(filePath);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/* ===============================
   KIRIM LAPORAN AKHIR
================================ */
exports.kirimLaporanAkhir = async (req, res) => {
  try {
    const userId = req.user.id;
    const { kesimpulan } = req.body;

    if (!kesimpulan) {
      return res.status(400).json({
        message: 'Kesimpulan tidak boleh kosong',
      });
    }

    const surat = await findPreferredSuratForUser(userId);

    if (!surat) {
      return res.status(404).json({
        message: 'Surat tugas tidak ditemukan',
      });
    }

    const user = await User.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Data pegawai tidak ditemukan',
      });
    }

    const presensi = await Presensi.findAll({
      where: {
        user_id: userId,
        surat_tugas_id: surat.id,
      },
      order: [['tanggal_presensi', 'ASC']],
    });

    if (!presensi.length) {
      return res.status(400).json({
        message: 'Belum ada presensi',
      });
    }

    const presensiBelumLengkapFoto = presensi.find((item) => parseFotoList(item?.foto).length < 2);
    if (presensiBelumLengkapFoto) {
      return res.status(400).json({
        message: 'Masih ada presensi harian yang belum memenuhi minimal 2 foto.',
        tanggal_presensi: presensiBelumLengkapFoto.tanggal_presensi || null,
        min_foto: 2,
        received_foto: parseFotoList(presensiBelumLengkapFoto?.foto).length,
      });
    }

    // Cek apakah sudah ada laporan/draft
    let existingLaporan = await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      }
    });

    // Siapkan data untuk PDF
    const pdfData = {
      pegawai: user,
      surat,
      presensi,
      kesimpulan,
    };

    // Tambahkan tanda tangan jika ada
    if (existingLaporan && existingLaporan.ttd_pegawai) {
      pdfData.ttd_pegawai = existingLaporan.ttd_pegawai;
    }

    const buktiPembayaran = readBuktiManifest(userId, surat.id);
    if (buktiPembayaran.length) {
      pdfData.bukti_pembayaran = buktiPembayaran;
    }

    // Generate PDF
    let pdfFile;
    let drivePdfFile = null;
    try {
      pdfFile = await generateLaporanPDF(pdfData);
      const pdfPath = path.join(__dirname, '../../uploads/pdf', pdfFile);
      drivePdfFile = await uploadFileToDrive({
        filePath: pdfPath,
        fileName: pdfFile,
        mimeType: 'application/pdf',
        subfolderPath: 'pdf',
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      return res.status(500).json({ 
        message: 'Gagal membuat laporan PDF atau upload ke Google Drive: ' + err.message 
      });
    }

    // Generate DOCX (editable) yang meniru layout PDF + upload
    let wordFile;
    let driveWordFile = null;
    try {
      wordFile = await generateLaporanWord(pdfData);
      const wordPath = path.join(__dirname, '../../uploads/word', wordFile);
      driveWordFile = await uploadFileToDrive({
        filePath: wordPath,
        fileName: wordFile,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        subfolderPath: 'word',
      });
    } catch (err) {
      console.error('Error generating WORD:', err);
      return res.status(500).json({
        message: 'Gagal membuat Word atau upload ke Google Drive: ' + err.message,
      });
    }

    if (existingLaporan) {
      // Update laporan yang ada
      await existingLaporan.update({
        kesimpulan,
        status: 'dikirim',
        file_pdf: drivePdfFile?.webContentLink || drivePdfFile?.webViewLink || pdfFile,
        file_word: driveWordFile?.webContentLink || driveWordFile?.webViewLink || wordFile,
        tanggal_kirim: new Date(),
        catatan_keuangan: null,
      });
    } else {
      // Buat laporan baru
      existingLaporan = await LaporanPerjalanan.create({
        pegawai_id: userId,
        surat_tugas_id: surat.id,
        kesimpulan,
        status: 'dikirim',
        file_pdf: drivePdfFile?.webContentLink || drivePdfFile?.webViewLink || pdfFile,
        file_word: driveWordFile?.webContentLink || driveWordFile?.webViewLink || wordFile,
        tanggal_kirim: new Date(),
      });
    }

    // Cleanup PDF lokal setelah berhasil upload dan save DB
    const localPdfPath = path.join(__dirname, '../../uploads/pdf', pdfFile);
    if (fs.existsSync(localPdfPath)) {
      fs.unlinkSync(localPdfPath);
    }

    // Cleanup WORD lokal setelah berhasil upload dan save DB
    const localWordPath = path.join(__dirname, '../../uploads/word', wordFile);
    if (fs.existsSync(localWordPath)) {
      fs.unlinkSync(localWordPath);
    }

    // Setelah laporan akhir terkirim, reset daftar bukti nota di UI.
    // File fisik tetap tersimpan di folder uploads/bukti-nota-pembayaran.
    writeBuktiManifest(userId, surat.id, []);

    res.json({
      success: true,
      message: 'Laporan akhir berhasil dikirim',
      data: existingLaporan,
      drive_file: drivePdfFile,
      drive_word_file: driveWordFile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};
