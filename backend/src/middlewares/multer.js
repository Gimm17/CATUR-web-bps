// middlewares/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi untuk upload TTD pegawai
const ttdPegawaiStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ttd-pegawai-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const ttdPegawaiFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PNG, JPG, atau JPEG yang diperbolehkan'), false);
  }
};

exports.uploadTTDPegawai = multer({
  storage: ttdPegawaiStorage,
  fileFilter: ttdPegawaiFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
}).single('ttd_pegawai');