const SuratTugas = require('../models/suratTugas.model');
const Presensi = require('../models/presensi.model');
const LaporanPerjalanan = require('../models/laporan.perjalanan');
const generateLaporanPDF = require('../utils/pdfGenerator');

exports.getLaporanPerjalanan = async (req, res) => {
  try {
    const userId = req.user.id;

    const surat = await SuratTugas.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
    });

    if (!surat) {
      return res.status(404).json({ message: 'Surat tugas tidak ditemukan' });
    }

    const presensi = await Presensi.findAll({
      where: {
        user_id: userId,
        surat_tugas_id: surat.id,
      },
    });

    const laporanAkhir = await LaporanPerjalanan.findOne({
      where: {
        user_id: userId,
        surat_tugas_id: surat.id,
      },
    });

    res.json({
      surat_tugas: surat,
      presensi,
      laporan_akhir: laporanAkhir,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.kirimLaporanAkhir = async (req, res) => {
  try {
    const userId = req.user.id;
    const { kesimpulan } = req.body;

    const presensi = await Presensi.findAll({
      where: { user_id: userId },
    });

    if (!presensi.length) {
      return res.status(400).json({ message: 'Belum ada presensi' });
    }

    const surat = await SuratTugas.findByPk(
      presensi[0].surat_tugas_id
    );

    const pdfFile = await generateLaporanPDF({
      pegawai: req.user,
      surat,
      presensi,
      kesimpulan,
    });

    const laporan = await LaporanPerjalanan.create({
      user_id: userId,
      surat_tugas_id: surat.id,
      kesimpulan,
      status: 'DIKIRIM',
      file_pdf: pdfFile,
      tanggal_kirim: new Date(),
    });

    res.json(laporan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
