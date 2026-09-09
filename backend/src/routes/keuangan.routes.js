// routes/keuangan.routes.js
const express = require('express');
const router = express.Router();
const keuangan = require('../controllers/keuangan.controller');
const auth = require('../middlewares/auth.middleware');
const isKeuangan = require('../middlewares/isKeuangan.middleware');
const isAdminOrKeuangan = require('../middlewares/isAdminOrKeuangan.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadToDrive = require('../middlewares/uploadToDrive.middleware');

const uploadDir = path.join(__dirname, '../../uploads/bukti-transfer');

console.log('='.repeat(50));
console.log('KONFIGURASI UPLOAD BUKTI TRANSFER');
console.log('Path folder uploads:', uploadDir);
console.log('='.repeat(50));

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Folder uploads/bukti-transfer berhasil dibuat');
  } else {
    console.log('Folder uploads/bukti-transfer sudah ada');
  }

  fs.accessSync(uploadDir, fs.constants.W_OK);
  console.log('Folder dapat ditulis');
} catch (err) {
  console.error('Error dengan folder uploads:', err.message);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `bukti_${timestamp}_${random}_${originalName}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    cb(null, true);
  },
});

router.get('/laporan', auth, isAdminOrKeuangan, keuangan.getLaporanKeuangan);
router.get('/export/excel', auth, isAdminOrKeuangan, keuangan.exportLaporanKeuanganExcel);
router.get('/export/pdf', auth, isAdminOrKeuangan, keuangan.exportLaporanKeuanganPdf);
router.get('/nota/:id', auth, isAdminOrKeuangan, keuangan.getBuktiNotaByLaporanId);
router.put('/kembalikan/:id', auth, isKeuangan, keuangan.kembalikanLaporan);
router.put('/teruskan/:id', auth, isKeuangan, keuangan.teruskanKeAtasan);

router.put(
  '/cairkan/:id',
  auth,
  isKeuangan,
  (req, res, next) => {
    console.log('Request cairkan dana diterima');
    console.log('Headers:', req.headers['content-type']);
    next();
  },
  upload.single('bukti_transfer'),
  (req, res, next) => {
    console.log('File upload process selesai');
    if (req.file) {
      console.log('File tersimpan:', req.file.filename);
      console.log('Lokasi:', req.file.path);
    } else {
      console.log('Tidak ada file dalam request');
    }
    next();
  },
  uploadToDrive,
  keuangan.cairkanDana
);

router.get('/bukti-transfer/:filename', auth, isKeuangan, (req, res) => {
  const filename = req.params.filename;
  const safeFilename = path.basename(filename);
  const filepath = path.join(uploadDir, safeFilename);

  console.log('Mengakses file:', filepath);

  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    console.log('File tidak ditemukan:', filepath);
    res.status(404).json({
      success: false,
      message: 'File bukti transfer tidak ditemukan',
    });
  }
});

module.exports = router;
