module.exports = (req, res, next) => {
  const role = req.user?.role;

  if (role !== 'admin' && role !== 'keuangan') {
    return res.status(403).json({
      message: 'Akses ditolak. Hanya admin atau bagian keuangan yang dapat mengakses.',
    });
  }

  next();
};
