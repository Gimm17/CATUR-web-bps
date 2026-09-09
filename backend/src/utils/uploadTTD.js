import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: 'uploads/ttd',
  filename: (req, file, cb) => {
    cb(null, `ttd-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const uploadTTD = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'image/png') {
      return cb(new Error('Tanda tangan harus PNG'));
    }
    cb(null, true);
  },
});

export default uploadTTD;
