const express = require('express');
const router = express.Router();
const presensiController = require('../controllers/presensi.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { uploadPresensi } = require('../middlewares/upload.middleware');
const requirePresensiPhoto = require('../middlewares/requirePresensiPhoto.middleware');
const stampPresensiPhoto = require('../middlewares/stampPresensi.middleware');
const uploadToDrive = require('../middlewares/uploadToDrive.middleware');

// Route untuk absen awal (foto + lokasi)
router.post(
  '/absen',
  authMiddleware,
  uploadPresensi,
  requirePresensiPhoto,
  stampPresensiPhoto,
  uploadToDrive,
  presensiController.presensiDinas
);

// Route untuk update laporan
router.put(
  '/:presensiId/laporan',
  authMiddleware,
  presensiController.updateLaporan
);

router.put(
  '/laporan',
  authMiddleware,
  (req, res, next) => {
    res.set('Deprecation', 'true');
    next();
  },
  presensiController.updateLaporan
);

// Route untuk cek status presensi hari ini
router.get(
  '/status',
  authMiddleware,
  presensiController.cekPresensiHariIni
);

// Backward compatibility (opsional)
router.post(
  '/',
  authMiddleware,
  uploadPresensi,
  requirePresensiPhoto,
  stampPresensiPhoto,
  uploadToDrive,
  presensiController.presensiDinas
);

module.exports = router;
