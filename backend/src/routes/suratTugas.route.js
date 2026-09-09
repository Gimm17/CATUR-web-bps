const express = require('express');
const router = express.Router();
const controller = require('../controllers/suratTugas.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const uploadSurat = require('../middlewares/uploadSurat.middleware');
const uploadToDrive = require('../middlewares/uploadToDrive.middleware');

// CREATE + UPLOAD FILE
router.post(
  '/',
  authMiddleware,
  uploadSurat.single('file_surat'),
  uploadToDrive,
  controller.createSuratTugas
);

// READ
router.get('/', authMiddleware, controller.getAll);
router.get('/aktif', authMiddleware, controller.getAktifByPegawai);
router.get('/user/:user_id', authMiddleware, controller.getByUserId); // Endpoint khusus by user_id
router.get('/stats', authMiddleware, controller.getDashboardStats);
router.get('/:id', authMiddleware, controller.getById);

// UPDATE
router.put('/:id', authMiddleware, controller.update);

// DELETE
router.delete('/:id', authMiddleware, controller.remove);

console.log('✅ Routes surat-tugas registered:');
console.log('   - GET /');
console.log('   - GET /aktif');
console.log('   - GET /user/:user_id');
console.log('   - GET /stats');
console.log('   - GET /:id');
console.log('   - POST /');
console.log('   - PUT /:id');
console.log('   - DELETE /:id');

module.exports = router;
