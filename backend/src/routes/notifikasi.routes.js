const express = require('express');
const router = express.Router();
const controller = require('../controllers/notifikasi.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, controller.getMyNotifikasi);
router.put('/:id/read', authMiddleware, controller.markAsRead);

module.exports = router;
