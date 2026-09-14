const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporan.controller');
const auth = require('../middlewares/auth.middleware');
const { uploadTTDMiddleware, uploadBuktiPembayaran } = require('../middlewares/upload.middleware');
const uploadToDrive = require('../middlewares/uploadToDrive.middleware');
const loadOwnedReportContext = require('../middlewares/reportContext.middleware');

router.get(
  '/perjalanan/surat/:suratId',
  auth,
  loadOwnedReportContext,
  laporanController.getLaporanPerjalananBySuratId
);

router.post(
  '/perjalanan/surat/:suratId/kirim',
  auth,
  loadOwnedReportContext,
  laporanController.kirimLaporanAkhir
);

router.post(
  '/perjalanan/surat/:suratId/ttd-pegawai',
  auth,
  loadOwnedReportContext,
  uploadTTDMiddleware.single('ttd_pegawai'),
  uploadToDrive,
  laporanController.uploadTTDPegawai
);

router.get(
  '/perjalanan/surat/:suratId/ttd-pegawai',
  auth,
  loadOwnedReportContext,
  laporanController.getTTDPegawai
);

router.post(
  '/perjalanan/surat/:suratId/bukti-pembayaran',
  auth,
  loadOwnedReportContext,
  laporanController.validateUploadBuktiPembayaran,
  uploadBuktiPembayaran,
  uploadToDrive,
  laporanController.uploadBuktiPembayaran
);

router.get(
  '/perjalanan/surat/:suratId/bukti-pembayaran',
  auth,
  loadOwnedReportContext,
  laporanController.getBuktiPembayaran
);

router.delete(
  '/perjalanan/surat/:suratId/bukti-pembayaran',
  auth,
  loadOwnedReportContext,
  laporanController.resetBuktiPembayaran
);

router.get(
  '/perjalanan',
  auth,
  laporanController.getLaporanPerjalanan
);

router.get(
  '/laporan/surat/:id',
  auth,
  laporanController.getLaporanBySuratId
);

router.post(
  '/perjalanan/kirim', 
  auth, 
  laporanController.kirimLaporanAkhir
);

// ROUTE TANDA TANGAN (INDEPENDENT - bisa sebelum ada laporan)
router.post(
  '/perjalanan/ttd-pegawai',
  auth,
  uploadTTDMiddleware.single('ttd_pegawai'),
  uploadToDrive,
  laporanController.uploadTTDPegawai
);

router.get(
  '/perjalanan/ttd-pegawai',
  auth,
  laporanController.getTTDPegawai
);

// ROUTE BUKTI NOTA/PEMBAYARAN PEGAWAI
router.post(
  '/perjalanan/bukti-pembayaran',
  auth,
  laporanController.validateUploadBuktiPembayaran,
  uploadBuktiPembayaran,
  uploadToDrive,
  laporanController.uploadBuktiPembayaran
);

router.get(
  '/perjalanan/bukti-pembayaran',
  auth,
  laporanController.getBuktiPembayaran
);

router.delete(
  '/perjalanan/bukti-pembayaran',
  auth,
  laporanController.resetBuktiPembayaran
);

module.exports = router;
