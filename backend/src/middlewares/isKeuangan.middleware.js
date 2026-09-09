module.exports = (req, res, next) => {
  if (req.user.role !== 'keuangan') {
    return res.status(403).json({ 
      message: 'Akses ditolak. Hanya bagian keuangan yang dapat mengakses.' 
    });
  }
  next();
};