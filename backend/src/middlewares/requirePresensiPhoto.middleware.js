module.exports = function requirePresensiPhoto(req, res, next) {
  const files = Array.isArray(req.files) && req.files.length > 0
    ? req.files
    : req.file
      ? [req.file]
      : [];

  if (files.length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Presensi membutuhkan minimal 1 foto.',
      min_foto: 1,
      received_foto: files.length,
    });
  }

  return next();
};

