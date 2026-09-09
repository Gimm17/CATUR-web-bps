module.exports = (req, res, next) => {
  if (req.user.role !== 'atasan') {
    return res.status(403).json({ message: 'Akses ditolak' });
  }
  next();
};
