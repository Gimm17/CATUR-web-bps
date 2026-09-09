const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join('uploads', 'signature');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    console.log(`Uploading file: ${file.originalname}, type: ${file.mimetype}`);
    cb(null, `ttd-${Date.now()}${ext}`);
  },
});

const uploadSignature = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar'));
    }
    cb(null, true);
  },
});

module.exports = uploadSignature;
