const express = require('express');
const router = express.Router();
const {
  getProfil,
  updateProfil,
  updatePassword,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/akun.controller');

const auth = require('../middlewares/auth.middleware');
const isAdmin = require('../middlewares/admin.middleware');

// === PROFIL USER LOGIN ===
router.get('/profil', auth, getProfil);
router.put('/profil', auth, updateProfil);
router.put('/password', auth, updatePassword);

// === CRUD ADMIN (HANYA ADMIN) ===
router.get("/all", auth, isAdmin, getAllUsers);
router.post("/", auth, isAdmin, createUser);
router.put("/:id", auth, isAdmin, updateUser);
router.delete("/:id", auth, isAdmin, deleteUser); // HANYA SATU ROUTE DELETE

module.exports = router;