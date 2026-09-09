module.exports = (req, res, next) => {
  // Hanya admin yang boleh akses
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Akses hanya untuk administrator" });
  }
  next();
};