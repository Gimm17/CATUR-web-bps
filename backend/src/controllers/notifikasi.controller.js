const Notifikasi = require('../models/notifikasi.model');

// GET NOTIFIKASI USER LOGIN
exports.getMyNotifikasi = async (req, res) => {
  try {
    const data = await Notifikasi.findAll({
      where: { user_id: req.user.id },
      order: [['id', 'DESC']],
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ NOTIFIKASI
exports.markAsRead = async (req, res) => {
  try {
    await Notifikasi.update(
      { is_read: true },
      { where: { id: req.params.id } }
    );

    res.json({ message: 'Notifikasi dibaca' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
