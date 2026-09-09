// controllers/keuangan.controller.js
const LaporanPerjalanan = require('../models/laporan.perjalanan');
const User = require('../models/user.model');
const SuratTugas = require('../models/suratTugas.model');
const Notifikasi = require('../models/notifikasi.model');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

const STATUS_KEUANGAN = [
  'dikirim',
  'dicek_keuangan',
  'disetujui_keuangan',
  'ditandatangani',
  'pencairan_dana',
  'dana_turun',
];

const STATUS_PRIORITY = {
  dikirim: 1,
  dicek_keuangan: 2,
  disetujui_keuangan: 3,
  ditandatangani: 4,
  pencairan_dana: 5,
  dana_turun: 6,
};

function formatDateId(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatExcelTextFormula(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '-') return '-';
  return `="${text.replace(/"/g, '""')}"`;
}

function mapLaporanItem(item) {
  const itemData = typeof item?.toJSON === 'function' ? item.toJSON() : item;
  if (itemData?.bukti_transfer) {
    itemData.bukti_transfer_file_name = itemData.bukti_transfer;
  }
  return itemData;
}

function buildExportRow(item, index) {
  return {
    no: index + 1,
    pegawai: item.user?.nama || '-',
    nip: item.user?.nip || '-',
    email: item.user?.email || '-',
    kegiatan: item.surat_tugas?.nama_kegiatan || '-',
    nomor_surat: item.surat_tugas?.nomor_surat || '-',
    daerah_tujuan: item.surat_tugas?.daerah_tujuan || '-',
    tanggal_mulai: formatDateId(item.surat_tugas?.tanggal_mulai),
    tanggal_selesai: formatDateId(item.surat_tugas?.tanggal_selesai),
    status: item.status || '-',
    status_pembayaran: item.status_pembayaran || '-',
    nominal_dana: item.nominal_dana || 0,
    catatan_keuangan: stripHtml(item.catatan_keuangan || '-'),
    tanggal_kirim: formatDateId(item.tanggal_kirim),
    tanggal_verifikasi_keuangan: formatDateId(item.tanggal_verifikasi_keuangan),
    tanggal_ttd: formatDateId(item.tanggal_ttd),
    tanggal_transfer: formatDateId(item.tanggal_transfer),
  };
}

function filterByTab(laporan = [], tab = 'semua') {
  switch (tab) {
    case 'menunggu':
      return laporan.filter((item) => item.status === 'dikirim' || item.status === 'dicek_keuangan');
    case 'perbaikan':
      return laporan.filter((item) => item.status === 'dikirim' && item.catatan_keuangan);
    case 'disetujui':
      return laporan.filter((item) => item.status === 'disetujui_keuangan');
    case 'ditandatangani':
      return laporan.filter((item) => item.status === 'ditandatangani');
    case 'dana_turun':
      return laporan.filter((item) => item.status === 'dana_turun');
    case 'semua':
    default:
      return laporan;
  }
}

function filterBySearch(laporan = [], search = '') {
  const keyword = String(search || '').trim().toLowerCase();
  if (!keyword) return laporan;

  return laporan.filter((item) => {
    const haystack = [
      item.user?.nama,
      item.user?.nip,
      item.user?.email,
      item.surat_tugas?.nama_kegiatan,
      item.surat_tugas?.nomor_surat,
      item.surat_tugas?.daerah_tujuan,
      item.status,
      item.catatan_keuangan,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  });
}

async function fetchLaporanKeuanganRecords() {
  console.log('Mendapatkan laporan untuk keuangan...');

  const laporan = await LaporanPerjalanan.findAll({
    where: {
      status: {
        [Op.in]: STATUS_KEUANGAN,
      },
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'nama', 'nip', 'email'],
      },
      {
        model: SuratTugas,
        as: 'surat_tugas',
        attributes: ['id', 'nomor_surat', 'daerah_tujuan', 'tanggal_mulai', 'tanggal_selesai', 'file_surat', 'nama_kegiatan'],
      },
    ],
    order: [
      ['updated_at', 'DESC'],
      ['tanggal_kirim', 'DESC'],
    ],
  });

  const mapped = laporan.map(mapLaporanItem);
  mapped.sort((a, b) => {
    const statusDiff = (STATUS_PRIORITY[a.status] || 99) - (STATUS_PRIORITY[b.status] || 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.tanggal_kirim || b.updated_at || 0) - new Date(a.tanggal_kirim || a.updated_at || 0);
  });

  console.log(`Ditemukan ${mapped.length} laporan`);
  return mapped;
}

async function getFilteredLaporanForExport(query = {}) {
  const records = await fetchLaporanKeuanganRecords();
  const filteredByTab = filterByTab(records, query.tab);
  return filterBySearch(filteredByTab, query.search);
}

// GET: Laporan untuk diverifikasi keuangan
exports.getLaporanKeuangan = async (req, res) => {
  try {
    const laporan = await fetchLaporanKeuanganRecords();
    res.json(laporan);
  } catch (err) {
    console.error('Error getLaporanKeuangan:', err);
    res.status(500).json({
      message: 'Gagal mengambil data laporan',
      error: err.message,
    });
  }
};

function getBuktiDir() {
  const dir = path.join(__dirname, '../../uploads/bukti-nota-pembayaran');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getBuktiManifestPath(userId, suratId) {
  const safeUser = String(userId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSurat = String(suratId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(getBuktiDir(), `manifest-${safeUser}-${safeSurat}.json`);
}

function readBuktiManifest(userId, suratId) {
  const manifestPath = getBuktiManifestPath(userId, suratId);
  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

// GET: Bukti nota/pembayaran berdasarkan ID laporan (keuangan)
exports.getBuktiNotaByLaporanId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'ID laporan wajib diisi' });
    }

    const laporan = await LaporanPerjalanan.findByPk(id);
    if (!laporan) {
      return res.status(404).json({ message: 'Laporan tidak ditemukan' });
    }

    const bukti = readBuktiManifest(laporan.pegawai_id, laporan.surat_tugas_id);
    return res.json({
      success: true,
      bukti_pembayaran: bukti,
    });
  } catch (err) {
    console.error('Error getBuktiNotaByLaporanId:', err);
    return res.status(500).json({
      message: 'Gagal mengambil bukti nota',
      error: err.message,
    });
  }
};

// PUT: Kembalikan laporan ke pegawai
exports.kembalikanLaporan = async (req, res) => {
  try {
    const { id } = req.params;
    const { catatan } = req.body;

    console.log(`Mengembalikan laporan ID: ${id}`);

    const laporan = await LaporanPerjalanan.findByPk(id);
    if (!laporan) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan',
      });
    }

    laporan.status = 'dikirim';
    laporan.catatan_keuangan = catatan;
    laporan.tanggal_verifikasi_keuangan = new Date();
    laporan.updated_at = new Date();

    await laporan.save();

    try {
      await Notifikasi.create({
        user_id: laporan.pegawai_id,
        judul: 'Laporan Dikembalikan Keuangan',
        pesan: `Laporan Anda dikembalikan untuk perbaikan. Catatan: ${catatan || '-'}`,
        is_read: false,
      });
    } catch (notifyErr) {
      console.error('Gagal membuat notifikasi:', notifyErr.message);
    }

    console.log(`Laporan ID ${id} berhasil dikembalikan`);

    res.json({
      success: true,
      message: 'Laporan berhasil dikembalikan ke pegawai',
      data: laporan,
    });
  } catch (err) {
    console.error('Error kembalikanLaporan:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengembalikan laporan',
      error: err.message,
    });
  }
};

// PUT: Teruskan ke atasan
exports.teruskanKeAtasan = async (req, res) => {
  try {
    const { id } = req.params;
    const { nominal_dana, catatan } = req.body;

    console.log(`Meneruskan laporan ID: ${id} ke atasan`);

    if (!nominal_dana || isNaN(nominal_dana)) {
      return res.status(400).json({
        message: 'Nominal dana harus diisi dan berupa angka',
      });
    }

    const laporan = await LaporanPerjalanan.findByPk(id);
    if (!laporan) {
      return res.status(404).json({
        message: 'Laporan tidak ditemukan',
      });
    }

    if (!['dikirim', 'dicek_keuangan'].includes(laporan.status)) {
      return res.status(400).json({
        message: 'Laporan tidak dapat diteruskan karena status sudah: ' + laporan.status,
      });
    }

    laporan.status = 'disetujui_keuangan';
    laporan.nominal_dana = parseInt(nominal_dana, 10);
    laporan.catatan_keuangan = catatan || `Disetujui keuangan dengan nominal Rp ${parseInt(nominal_dana, 10).toLocaleString('id-ID')}`;
    laporan.tanggal_verifikasi_keuangan = new Date();

    await laporan.save();

    try {
      await Notifikasi.create({
        user_id: laporan.pegawai_id,
        judul: 'Laporan Disetujui Keuangan',
        pesan: `Laporan Anda disetujui keuangan dan diteruskan ke atasan. Nominal disetujui: Rp ${parseInt(nominal_dana, 10).toLocaleString('id-ID')}.`,
        is_read: false,
      });
    } catch (notifyErr) {
      console.error('Gagal membuat notifikasi:', notifyErr.message);
    }

    res.json({
      success: true,
      message: 'Laporan disetujui keuangan dan diteruskan ke atasan',
      data: {
        id: laporan.id,
        status: laporan.status,
        nominal_dana: laporan.nominal_dana,
      },
    });
  } catch (err) {
    console.error('Error teruskanKeAtasan:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal meneruskan ke atasan',
      error: err.message,
    });
  }
};

// PUT: Cairkan dana
exports.cairkanDana = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggal_transfer, catatan } = req.body;

    console.log(`Mencairkan dana untuk laporan ID: ${id}`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Bukti transfer wajib diupload',
      });
    }

    const laporan = await LaporanPerjalanan.findByPk(id);
    if (!laporan) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan',
      });
    }

    const fileName = req.file.filename;
    const driveFile = req.file.drive || null;
    const buktiTransferValue = driveFile?.webContentLink || driveFile?.webViewLink || fileName;

    console.log('File tersimpan:', {
      filename: fileName,
      path: req.file.path,
      size: req.file.size,
    });

    laporan.status = 'dana_turun';
    laporan.bukti_transfer = buktiTransferValue;
    laporan.tanggal_transfer = tanggal_transfer || new Date().toISOString().split('T')[0];
    laporan.status_pembayaran = 'selesai';
    laporan.catatan_keuangan = catatan || 'Dana berhasil dicairkan';

    await laporan.save();

    try {
      await Notifikasi.create({
        user_id: laporan.pegawai_id,
        judul: 'Dana Telah Dicairkan',
        pesan: 'Dana perjalanan dinas Anda sudah berhasil diturunkan. Mohon cek rekening Anda masing-masing.',
        is_read: false,
      });
    } catch (notifyErr) {
      console.error('Gagal membuat notifikasi:', notifyErr.message);
    }

    console.log(`Laporan ID ${id} berhasil dicairkan. File: ${fileName}`);

    res.json({
      success: true,
      message: 'Dana sudah berhasil diturunkan. Mohon informasikan pegawai agar mengecek rekeningnya masing-masing.',
      data: {
        id: laporan.id,
        status: laporan.status,
        nominal_dana: laporan.nominal_dana,
        bukti_transfer: buktiTransferValue,
        bukti_transfer_file_name: buktiTransferValue,
        bukti_transfer_drive: driveFile,
        tanggal_transfer: laporan.tanggal_transfer,
      },
    });
  } catch (err) {
    console.error('Error cairkanDana:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mencairkan dana',
      error: err.message,
    });
  }
};

exports.exportLaporanKeuanganExcel = async (req, res) => {
  try {
    const laporan = await getFilteredLaporanForExport(req.query || {});
    const rows = laporan.map(buildExportRow);
    const generatedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    const htmlRows = rows.map((row) => `
      <tr>
        <td>${row.no}</td>
        <td>${escapeHtml(row.pegawai)}</td>
        <td style="mso-number-format:'\\@';">${escapeHtml(formatExcelTextFormula(row.nip))}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(row.kegiatan)}</td>
        <td>${escapeHtml(row.nomor_surat)}</td>
        <td>${escapeHtml(row.daerah_tujuan)}</td>
        <td>${escapeHtml(row.tanggal_mulai)}</td>
        <td>${escapeHtml(row.tanggal_selesai)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.status_pembayaran)}</td>
        <td style="mso-number-format:'\\#\\,\\#\\#0';">${row.nominal_dana}</td>
        <td>${escapeHtml(row.catatan_keuangan)}</td>
        <td>${escapeHtml(row.tanggal_kirim)}</td>
        <td>${escapeHtml(row.tanggal_verifikasi_keuangan)}</td>
        <td>${escapeHtml(row.tanggal_ttd)}</td>
        <td>${escapeHtml(row.tanggal_transfer)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #1d4ed8; color: #fff; }
            h2, p { margin: 0 0 12px 0; }
          </style>
        </head>
        <body>
          <h2>Export Laporan Keuangan</h2>
          <p>Dibuat: ${escapeHtml(generatedAt)}</p>
          <p>Total data: ${rows.length}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Pegawai</th>
                <th>NIP</th>
                <th>Email</th>
                <th>Kegiatan</th>
                <th>Nomor Surat</th>
                <th>Daerah Tujuan</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Status Laporan</th>
                <th>Status Pembayaran</th>
                <th>Nominal Dana</th>
                <th>Catatan Keuangan</th>
                <th>Tanggal Kirim</th>
                <th>Tanggal Verifikasi</th>
                <th>Tanggal TTD</th>
                <th>Tanggal Transfer</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const fileName = `laporan-keuangan-${new Date().toISOString().slice(0, 10)}.xls`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(`\ufeff${html}`);
  } catch (err) {
    console.error('Error exportLaporanKeuanganExcel:', err);
    res.status(500).json({
      message: 'Gagal export Excel laporan keuangan',
      error: err.message,
    });
  }
};

exports.exportLaporanKeuanganPdf = async (req, res) => {
  try {
    const laporan = await getFilteredLaporanForExport(req.query || {});
    const rows = laporan.map(buildExportRow);
    const fileName = `laporan-keuangan-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(16).text('Export Laporan Keuangan', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Tanggal export: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })}`);
    doc.text(`Total data: ${rows.length}`);
    doc.moveDown();

    rows.forEach((row, index) => {
      if (index > 0) {
        doc.moveDown(0.5);
      }

      if (doc.y > 740) {
        doc.addPage();
      }

      doc.font('Helvetica-Bold').fontSize(11).text(`${row.no}. ${row.pegawai} - ${row.kegiatan}`);
      doc.font('Helvetica').fontSize(9);
      doc.text(`NIP: ${row.nip}`);
      doc.text(`Email: ${row.email}`);
      doc.text(`Nomor Surat: ${row.nomor_surat}`);
      doc.text(`Lokasi: ${row.daerah_tujuan}`);
      doc.text(`Perjadin: ${row.tanggal_mulai} s.d. ${row.tanggal_selesai}`);
      doc.text(`Status: ${row.status} | Pembayaran: ${row.status_pembayaran}`);
      doc.text(`Nominal Dana: Rp ${Number(row.nominal_dana || 0).toLocaleString('id-ID')}`);
      doc.text(`Tanggal Kirim: ${row.tanggal_kirim} | Verifikasi: ${row.tanggal_verifikasi_keuangan}`);
      doc.text(`Tanggal TTD: ${row.tanggal_ttd} | Transfer: ${row.tanggal_transfer}`);
      doc.text(`Catatan: ${row.catatan_keuangan || '-'}`);
      doc.moveTo(40, doc.y + 6).lineTo(555, doc.y + 6).strokeColor('#d1d5db').stroke();
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error('Error exportLaporanKeuanganPdf:', err);
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Gagal export PDF laporan keuangan',
        error: err.message,
      });
    }
  }
};
