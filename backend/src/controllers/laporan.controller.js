const SuratTugas = require('../models/suratTugas.model');
const Presensi = require('../models/presensi.model');
const User = require('../models/user.model');
const LaporanPerjalanan = require('../models/laporan.perjalanan');
const generateLaporanPDF = require('../utils/pdfGenerator');
const generateLaporanWord = require('../utils/wordGenerator');
const appendBuktiPagesToSignedPDF = require('../utils/pdfAppendBukti');
const { uploadFileToDrive } = require('../utils/googleDrive');
const { resolveActiveAssignment } = require('../services/activeAssignment.service');
const { getOwnedReportContext } = require('../services/reportContext.service');
const { assertReportEditable } = require('../services/reportWindow.service');
const { getBusinessDate, isDateWithin } = require('../utils/businessDate');
const {
  parseFotoMeta,
  parseFotoList,
  isPresensiFotoLengkap,
} = require('../utils/presensiFoto');
const fs = require('fs');
const path = require('path');

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function normalizePresensiPhotos(presensiList = []) {
  const list = Array.isArray(presensiList) ? presensiList : [];
  return list.map((p) => {
    const obj = typeof p?.toJSON === 'function' ? p.toJSON() : p;
    const meta = parseFotoMeta(obj?.foto);
    const fotoList = meta.photos;
    return {
      ...obj,
      foto: fotoList[0] || null,
      foto_list: fotoList,
      force_foto_by_admin: meta.force_foto_by_admin,
      force_foto_reason: meta.force_foto_reason,
      force_foto_at: meta.force_foto_at,
      force_foto_admin_nama: meta.force_foto_admin_nama,
      is_foto_lengkap: isPresensiFotoLengkap(obj?.foto),
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
  const activeAssignment = await resolveActiveAssignment(userId);
  return activeAssignment?.surat || null;
}

async function resolveSuratFromRequest(req, userId) {
  return req.reportContext?.surat || findPreferredSuratForUser(userId);
}

function sendControllerError(res, error, fallbackMessage) {
  const isReportUniqueConflict = error?.name === 'SequelizeUniqueConstraintError'
    && (error?.parent?.constraint === 'uq_laporan_perjalanan_surat_pegawai'
      || error?.original?.constraint === 'uq_laporan_perjalanan_surat_pegawai');
  if (isReportUniqueConflict) {
    return res.status(409).json({
      success: false,
      code: 'REPORT_ALREADY_EXISTS',
      message: 'Laporan untuk surat tugas ini sudah tersedia.',
    });
  }
  const isKnownError = Number.isInteger(error.status) && error.code;
  return res.status(isKnownError ? error.status : 500).json({
    success: false,
    code: isKnownError ? error.code : 'INTERNAL_SERVER_ERROR',
    message: isKnownError ? error.message : fallbackMessage,
    ...(error.reportWindow ? { report_window: error.reportWindow } : {}),
  });
}

async function buildPerjalananResponse({ userId, surat, reportWindow }) {
  const user = await User.findOne({ where: { id: userId } });
  if (!user) {
    const error = new Error('Data pegawai tidak ditemukan.');
    error.status = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const [presensi, laporanAkhir] = await Promise.all([
    Presensi.findAll({
      where: { user_id: userId, surat_tugas_id: surat.id },
      order: [['tanggal_presensi', 'ASC']],
    }),
    LaporanPerjalanan.findOne({
      where: { pegawai_id: userId, surat_tugas_id: surat.id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'nama', 'nip', 'email', 'role', 'unit_kerja'],
      }],
    }),
  ]);

  const pembayaran = laporanAkhir ? {
    status: laporanAkhir.status_pembayaran,
    nominal: laporanAkhir.nominal_dana,
    bukti_transfer: laporanAkhir.bukti_transfer,
    tanggal_transfer: laporanAkhir.tanggal_transfer,
  } : null;
  const tujuan = Array.isArray(surat.tujuan)
    ? [...surat.tujuan].sort((left, right) => Number(left.urutan) - Number(right.urutan))
    : [];
  const businessDate = getBusinessDate();
  const tujuanAktif = tujuan.find((item) => isDateWithin(
    businessDate,
    item.tanggal_mulai,
    item.tanggal_selesai
  )) || null;

  return {
    user,
    surat_tugas: surat,
    tujuan,
    tujuan_aktif: tujuanAktif,
    presensi: normalizePresensiPhotos(presensi),
    laporan_akhir: laporanAkhir,
    pembayaran,
    bukti_pembayaran: readBuktiManifest(userId, surat.id),
    report_window: reportWindow,
  };
}

exports.getLaporanPerjalananBySuratId = async (req, res) => {
  try {
    const { surat, reportWindow } = req.reportContext;
    return res.json(await buildPerjalananResponse({
      userId: req.user.id,
      surat,
      reportWindow,
    }));
  } catch (error) {
    console.error('Error getLaporanPerjalananBySuratId:', error);
    return res.status(error.status || 500).json({
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.status ? error.message : 'Gagal mengambil progres laporan.',
    });
  }
};

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

    const surat = await resolveSuratFromRequest(req, userId);

    if (!surat) {
      return res.status(404).json({
        code: 'NO_ACTIVE_ASSIGNMENT',
        message: 'Tidak ada surat tugas aktif hari ini.',
      });
    }
    const context = await getOwnedReportContext({ suratId: surat.id, userId });
    return res.json(await buildPerjalananResponse({
      userId,
      surat: context.surat,
      reportWindow: context.reportWindow,
    }));
  } catch (err) {
    console.error(err);
    const isConflict = err.code === 'ACTIVE_ASSIGNMENT_CONFLICT';
    res.status(isConflict ? 409 : 500).json({
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: isConflict ? err.message : 'Gagal mengambil progres laporan.',
    });
  }
};

/* ===============================
   UPLOAD TANDA TANGAN PEGAWAI (INDEPENDENT)
   Bisa upload TTD sebelum ada laporan
================================ */
exports.uploadTTDPegawai = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.reportContext) assertReportEditable(req.reportContext.reportWindow);

    // Validasi file
    if (!req.file) {
      return res.status(400).json({
        message: 'File tanda tangan diperlukan'
      });
    }

    // Cari surat tugas aktif user
    const surat = await resolveSuratFromRequest(req, userId);

    if (!surat) {
      return res.status(404).json({
        message: 'Surat tugas tidak ditemukan'
      });
    }

    // Cek apakah sudah ada laporan atau draft
    let existingLaporan = req.reportContext?.laporan || await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      }
    });

    const ttdValue =
      req.file.drive?.webContentLink ||
      req.file.drive?.webViewLink ||
      req.file.filename ||
      null;

    if (existingLaporan) {
      // Jika sudah ada laporan/draft, update TTD
      
      // Hapus file lama jika ada
      if (
        existingLaporan.ttd_pegawai &&
        !isHttpUrl(existingLaporan.ttd_pegawai) &&
        existingLaporan.ttd_pegawai !== req.file.filename
      ) {
        const oldFilePath = path.join(__dirname, '../../uploads/ttd', existingLaporan.ttd_pegawai);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      await existingLaporan.update({
        ttd_pegawai: ttdValue,
        tanggal_ttd_pegawai: new Date()
      });

    } else {
      // Jika belum ada, buat record baru dengan status draft
      existingLaporan = await LaporanPerjalanan.create({
        pegawai_id: userId,
        surat_tugas_id: surat.id,
        ttd_pegawai: ttdValue,
        tanggal_ttd_pegawai: new Date(),
        status: 'draft',
        kesimpulan: '' // Kosongkan kesimpulan
      });
    }

    const regenResult = await regenerateLaporanFilesIfExists({
      userId,
      suratId: surat.id,
      surat,
      laporan: existingLaporan,
    });

    res.json({
      success: true,
      message: regenResult.regenerated
        ? 'Tanda tangan berhasil diupload dan dokumen laporan telah diperbarui otomatis'
        : 'Tanda tangan berhasil diupload',
      data: {
        ttd_pegawai: ttdValue,
        tanggal_ttd_pegawai: existingLaporan.tanggal_ttd_pegawai,
        file_pdf: existingLaporan.file_pdf || null,
        file_word: existingLaporan.file_word || null,
        regenerated: regenResult.regenerated,
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
    
    return sendControllerError(res, err, 'Gagal menyimpan tanda tangan.');
  }
};

/* ===============================
   UPLOAD BUKTI PEMBAYARAN/NOTA PEGAWAI
================================ */
exports.validateUploadBuktiPembayaran = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (req.reportContext) assertReportEditable(req.reportContext.reportWindow);

    const surat = await resolveSuratFromRequest(req, userId);

    if (!surat) {
      return res.status(404).json({
        success: false,
        message: 'Surat tugas tidak ditemukan',
      });
    }

    const existingLaporan = req.reportContext?.laporan || await LaporanPerjalanan.findOne({
      where: {
        pegawai_id: userId,
        surat_tugas_id: surat.id,
      }
    });

    const allowedStatuses = ['draft', 'dikirim', 'dicek_keuangan', 'disetujui_keuangan'];
    if (!existingLaporan || !allowedStatuses.includes(existingLaporan.status)) {
      return res.status(400).json({
        success: false,
        message: 'Upload nota dinas hanya bisa dilakukan selama laporan belum disetujui atasan',
      });
    }

    req.currentSurat = surat;
    req.currentLaporan = existingLaporan;
    return next();
  } catch (err) {
    console.error(err);
    return sendControllerError(res, err, 'Gagal memvalidasi upload nota.');
  }
};

exports.uploadBuktiPembayaran = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.reportContext) assertReportEditable(req.reportContext.reportWindow);

    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File bukti pembayaran/nota diperlukan',
      });
    }

    const surat = req.currentSurat || await resolveSuratFromRequest(req, userId);

    if (!surat) {
      return res.status(404).json({
        success: false,
        message: 'Surat tugas tidak ditemukan',
      });
    }

    const existingLaporan = req.currentLaporan
      || req.reportContext?.laporan
      || await LaporanPerjalanan.findOne({
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

    // Jika belum ditandatangani atasan, regenerate PDF dan Word secara penuh agar selalu sinkron.
    const hasSignedPdf = Boolean(existingLaporan.file_pdf_signed);
    let driveUpdatedPdf = null;
    if (!hasSignedPdf && (existingLaporan.file_pdf || existingLaporan.file_word || existingLaporan.status !== 'draft')) {
      const regen = await regenerateLaporanFilesIfExists({
        userId,
        suratId: surat.id,
        surat,
        laporan: existingLaporan,
      });
      driveUpdatedPdf = regen.drivePdfFile || null;
    } else if (hasSignedPdf) {
      const pdfSource = existingLaporan.file_pdf_signed;
      const sourcePath = isHttpUrl(pdfSource)
        ? pdfSource
        : path.join(__dirname, '../../uploads/pdf', pdfSource);

      const updatedPdfPath = await appendBuktiPagesToSignedPDF({
        existingPdfPath: sourcePath,
        buktiPembayaran: newFiles,
      });

      const updatedPdfFileName = path.basename(updatedPdfPath);
      try {
        driveUpdatedPdf = await uploadFileToDrive({
          filePath: updatedPdfPath,
          fileName: updatedPdfFileName,
          mimeType: 'application/pdf',
          subfolderPath: 'pdf/signed',
        });
      } catch {
        driveUpdatedPdf = null;
      }

      const updatedUrl =
        driveUpdatedPdf?.webContentLink || driveUpdatedPdf?.webViewLink || updatedPdfFileName;
      existingLaporan.file_pdf_signed = updatedUrl;
      await existingLaporan.save();

      if ((driveUpdatedPdf?.webContentLink || driveUpdatedPdf?.webViewLink) && fs.existsSync(updatedPdfPath)) {
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
        file_pdf: existingLaporan.file_pdf,
        file_word: existingLaporan.file_word,
      }
    });
  } catch (err) {
    console.error(err);
    return sendControllerError(res, err, 'Gagal mengupload bukti pembayaran.');
  }
};

/* ===============================
   GET BUKTI PEMBAYARAN/NOTA PEGAWAI
================================ */
exports.getBuktiPembayaran = async (req, res) => {
  try {
    const userId = req.user.id;

    const surat = await resolveSuratFromRequest(req, userId);

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
    return sendControllerError(res, err, 'Gagal membaca bukti pembayaran.');
  }
};

/* ===============================
   RESET BUKTI PEMBAYARAN/NOTA PEGAWAI
================================ */
exports.resetBuktiPembayaran = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.reportContext) assertReportEditable(req.reportContext.reportWindow);

    const surat = await resolveSuratFromRequest(req, userId);

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

    const regen = await regenerateLaporanFilesIfExists({
      userId,
      suratId: surat.id,
      surat,
      laporan: req.reportContext?.laporan || null,
    });

    return res.json({
      success: true,
      message: 'Bukti nota berhasil direset',
      regenerated: regen.regenerated,
    });
  } catch (err) {
    console.error(err);
    return sendControllerError(res, err, 'Gagal mereset bukti pembayaran.');
  }
};

async function regenerateLaporanFilesIfExists({
  userId,
  suratId,
  surat: providedSurat = null,
  laporan: providedLaporan = null,
} = {}) {
  try {
    if (!userId || !suratId) {
      return { regenerated: false };
    }

    const existingLaporan =
      providedLaporan ||
      (await LaporanPerjalanan.findOne({
        where: {
          pegawai_id: userId,
          surat_tugas_id: suratId,
        },
      }));

    if (!existingLaporan) {
      return { regenerated: false, laporan: null };
    }

    const lockedStatuses = ['ditandatangani', 'pencairan_dana', 'dana_turun'];
    if (lockedStatuses.includes(existingLaporan.status)) {
      return { regenerated: false, laporan: existingLaporan };
    }

    const hasGeneratedBefore = Boolean(
      existingLaporan.file_pdf ||
        existingLaporan.file_word ||
        (existingLaporan.status && existingLaporan.status !== 'draft')
    );

    if (!hasGeneratedBefore) {
      return { regenerated: false, laporan: existingLaporan };
    }

    const [user, surat, presensi] = await Promise.all([
      User.findOne({ where: { id: userId } }),
      providedSurat || SuratTugas.findByPk(suratId),
      Presensi.findAll({
        where: {
          user_id: userId,
          surat_tugas_id: suratId,
        },
        order: [['tanggal_presensi', 'ASC']],
      }),
    ]);

    if (!user || !surat || !presensi.length) {
      return { regenerated: false, laporan: existingLaporan };
    }

    const buktiPembayaran = readBuktiManifest(userId, surat.id);
    const pdfData = {
      pegawai: user,
      surat,
      presensi,
      kesimpulan: existingLaporan.kesimpulan || '-',
      ttd_pegawai: existingLaporan.ttd_pegawai || null,
      ...(buktiPembayaran.length ? { bukti_pembayaran: buktiPembayaran } : {}),
    };

    const pdfFile = await generateLaporanPDF(pdfData);
    const pdfPath = path.join(__dirname, '../../uploads/pdf', pdfFile);
    let drivePdfFile = null;
    try {
      drivePdfFile = await uploadFileToDrive({
        filePath: pdfPath,
        fileName: pdfFile,
        mimeType: 'application/pdf',
        subfolderPath: 'pdf',
      });
    } catch {
      drivePdfFile = null;
    }

    const wordFile = await generateLaporanWord(pdfData);
    const wordPath = path.join(__dirname, '../../uploads/word', wordFile);
    let driveWordFile = null;
    try {
      driveWordFile = await uploadFileToDrive({
        filePath: wordPath,
        fileName: wordFile,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        subfolderPath: 'word',
      });
    } catch {
      driveWordFile = null;
    }

    const nextPdfRef = drivePdfFile?.webContentLink || drivePdfFile?.webViewLink || pdfFile;
    const nextWordRef = driveWordFile?.webContentLink || driveWordFile?.webViewLink || wordFile;

    await existingLaporan.update({
      file_pdf: nextPdfRef,
      file_word: nextWordRef,
    });

    if ((drivePdfFile?.webContentLink || drivePdfFile?.webViewLink) && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    if ((driveWordFile?.webContentLink || driveWordFile?.webViewLink) && fs.existsSync(wordPath)) {
      fs.unlinkSync(wordPath);
    }

    return {
      regenerated: true,
      laporan: existingLaporan,
      drivePdfFile,
      driveWordFile,
    };
  } catch (err) {
    console.warn('Warning regenerateLaporanFilesIfExists:', err.message);
    return { regenerated: false, error: err };
  }
}

/* ===============================
   GET TANDA TANGAN PEGAWAI
================================ */
exports.getTTDPegawai = async (req, res) => {
  try {
    const userId = req.user.id;

    // Cari surat tugas aktif
    const surat = await resolveSuratFromRequest(req, userId);

    if (!surat) {
      return res.status(404).json({
        message: 'Surat tugas tidak ditemukan'
      });
    }

    // Cari laporan atau draft
    const laporan = req.reportContext?.laporan || await LaporanPerjalanan.findOne({
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
    if (req.reportContext) assertReportEditable(req.reportContext.reportWindow);
    const { kesimpulan } = req.body;

    if (!kesimpulan) {
      return res.status(400).json({
        message: 'Kesimpulan tidak boleh kosong',
      });
    }

    const surat = await resolveSuratFromRequest(req, userId);

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

    const presensiBelumLengkapFoto = presensi.find((item) => !isPresensiFotoLengkap(item?.foto));
    if (presensiBelumLengkapFoto) {
      return res.status(400).json({
        message: 'Masih ada presensi harian yang belum memenuhi minimal 2 foto.',
        tanggal_presensi: presensiBelumLengkapFoto.tanggal_presensi || null,
        min_foto: 2,
        received_foto: parseFotoList(presensiBelumLengkapFoto?.foto).length,
      });
    }

    // Cek apakah sudah ada laporan/draft
    let existingLaporan = req.reportContext?.laporan || await LaporanPerjalanan.findOne({
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
      try {
        drivePdfFile = await uploadFileToDrive({
          filePath: pdfPath,
          fileName: pdfFile,
          mimeType: 'application/pdf',
          subfolderPath: 'pdf',
        });
      } catch (driveErr) {
        console.warn('Upload PDF ke Google Drive dilewati, menggunakan file lokal:', driveErr.message);
        drivePdfFile = null;
      }
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
      try {
        driveWordFile = await uploadFileToDrive({
          filePath: wordPath,
          fileName: wordFile,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          subfolderPath: 'word',
        });
      } catch (driveErr) {
        console.warn('Upload Word ke Google Drive dilewati, menggunakan file lokal:', driveErr.message);
        driveWordFile = null;
      }
    } catch (err) {
      console.error('Error generating WORD:', err);
      return res.status(500).json({
        message: 'Gagal membuat Word atau upload ke Google Drive: ' + err.message,
      });
    }

    const nextStatus =
      existingLaporan && ['dicek_keuangan', 'disetujui_keuangan'].includes(existingLaporan.status)
        ? existingLaporan.status
        : 'dikirim';

    if (existingLaporan) {
      // Update laporan yang ada
      await existingLaporan.update({
        kesimpulan,
        status: nextStatus,
        file_pdf: drivePdfFile?.webContentLink || drivePdfFile?.webViewLink || pdfFile,
        file_word: driveWordFile?.webContentLink || driveWordFile?.webViewLink || wordFile,
        tanggal_kirim: existingLaporan.tanggal_kirim || new Date(),
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

    // Cleanup PDF lokal hanya jika berhasil diupload ke Drive
    const localPdfPath = path.join(__dirname, '../../uploads/pdf', pdfFile);
    if ((drivePdfFile?.webContentLink || drivePdfFile?.webViewLink) && fs.existsSync(localPdfPath)) {
      fs.unlinkSync(localPdfPath);
    }

    // Cleanup WORD lokal hanya jika berhasil diupload ke Drive
    const localWordPath = path.join(__dirname, '../../uploads/word', wordFile);
    if ((driveWordFile?.webContentLink || driveWordFile?.webViewLink) && fs.existsSync(localWordPath)) {
      fs.unlinkSync(localWordPath);
    }

    res.json({
      success: true,
      message: 'Laporan akhir berhasil dikirim',
      data: existingLaporan,
      drive_file: drivePdfFile,
      drive_word_file: driveWordFile,
    });
  } catch (err) {
    console.error(err);
    return sendControllerError(res, err, 'Gagal mengirim laporan akhir.');
  }
};

exports.buildPerjalananResponse = buildPerjalananResponse;
exports.regenerateLaporanFilesIfExists = regenerateLaporanFilesIfExists;
