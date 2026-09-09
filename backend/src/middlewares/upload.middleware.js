const multer = require('multer');
const path = require('path');
const fs = require('fs');

function inferImageExtension(file) {
  const originalExt = path.extname(file?.originalname || '').toLowerCase();
  if (originalExt) return originalExt;

  const mimeType = String(file?.mimetype || '').toLowerCase();
  if (mimeType === 'image/heic') return '.heic';
  if (mimeType === 'image/heif') return '.heif';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return '.jpg';
  return '.jpg';
}

function isAllowedImageUpload(file) {
  const mimeType = String(file?.mimetype || '').toLowerCase();
  const ext = path.extname(file?.originalname || '').toLowerCase();

  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp'];

  return allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(ext);
}

// ===================== KONFIGURASI UNTUK PRESENSI =====================
const presensiStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/presensi';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = inferImageExtension(file);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `presensi-${uniqueSuffix}${ext}`);
  }
});

// ===================== KONFIGURASI UNTUK TANDA TANGAN =====================
const ttdStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/ttd';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'ttd-' + uniqueSuffix + ext);
  }
});

// ===================== KONFIGURASI UNTUK BUKTI NOTA/PEMBAYARAN =====================
const buktiPembayaranStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/bukti-nota-pembayaran';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'nota-' + uniqueSuffix + ext);
  }
});

// ===================== FILTER FILE =====================
const imageFilter = (req, file, cb) => {
  if (isAllowedImageUpload(file)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang didukung seperti JPG, JPEG, PNG, HEIC, HEIF, atau WEBP yang diperbolehkan'), false);
  }
};

const buktiPembayaranFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file JPG, JPEG, PNG, atau PDF yang diperbolehkan'), false);
  }
};

// ===================== BUAT INSTANCE MULTER =====================
const uploadPresensi = multer({
  storage: presensiStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB untuk foto presensi
  }
});

const uploadTTD = multer({
  storage: ttdStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 2MB untuk tanda tangan
  }
});

const uploadBuktiPembayaran = multer({
  storage: buktiPembayaranStorage,
  fileFilter: buktiPembayaranFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per file
  }
});

// ===================== EKSPOR MIDDLEWARE =====================
module.exports = {
  // Middleware untuk upload presensi (minimal 2 foto)
  // Kirim multiple files dengan field name yang sama: "foto"
  uploadPresensi: uploadPresensi.array('foto', 5),
  
  // Middleware untuk upload tanda tangan (single file)
  uploadTTD: uploadTTD.single('ttd_pegawai'),

  // Middleware untuk upload bukti nota/pembayaran (multiple file)
  uploadBuktiPembayaran: uploadBuktiPembayaran.array('bukti_pembayaran', 10),
  
  // Untuk penggunaan langsung
  uploadTTDMiddleware: uploadTTD,
  uploadBuktiPembayaranMiddleware: uploadBuktiPembayaran
};
