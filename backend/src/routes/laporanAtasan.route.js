const express = require('express');
const router = express.Router();
const laporanAtasanController = require('../controllers/laporanAtasan.controller');
const auth = require('../middlewares/auth.middleware');
const isAtasan = require('../middlewares/isAtasan.middleware');
const uploadSignature = require('../middlewares/uploadSignature.middleware');
const uploadToDrive = require('../middlewares/uploadToDrive.middleware');

router.get(
  '/laporan',
  auth,
  isAtasan,
  laporanAtasanController.getDaftarLaporan
);

router.get(
  '/progres-pegawai',
  auth,
  isAtasan,
  laporanAtasanController.getlaporanPegawai
);

router.post(
  '/laporan/:id/approve',
  auth,
  isAtasan,
  uploadSignature.single('ttd'), // Pastikan nama field sesuai
  uploadToDrive,
  laporanAtasanController.approveLaporan
);

module.exports = router;
