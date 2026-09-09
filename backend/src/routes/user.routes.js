// user.routes.js
const express = require('express');
const router = express.Router();
const { getPegawai, getAllUsers, getUserById, getPegawaiCount } = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');

router.get('/', auth, getPegawai); // Rute untuk pegawai
router.get('/all', auth, getAllUsers); // Rute untuk semua pengguna
router.get('/count', auth, getPegawaiCount);
router.get('/:id', auth, getUserById); // Rute untuk pengguna berdasarkan ID
module.exports = router;