module.exports = function requireMinPresensiPhotos(req, res, next) {
  const files = Array.isArray(req.files) && req.files.length > 0
    ? req.files
    : req.file
      ? [req.file]
      : [];

  if (files.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Presensi membutuhkan minimal 2 foto.',
      min_foto: 2,
      received_foto: files.length,
    });
  }

  return next();
};

