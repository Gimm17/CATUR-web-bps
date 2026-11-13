const Presensi = require('../models/presensi.model');
const SuratTugas = require('../models/suratTugas.model');
const Daerah = require('../models/daerah.model');
const User = require('../models/user.model');
const Notifikasi = require('../models/notifikasi.model');
const { isPointInsideGeojson } = require('../utils/geojsonPolygon');
const { getTodayDate } = require('../utils/date');
const { Op } = require('sequelize');
const { getOwnedReportContext } = require('../services/reportContext.service');
const { assertReportEditable } = require('../services/reportWindow.service');
const {
  parseFotoMeta,
  parseFotoList,
  isPresensiFotoLengkap,
  serializeFotoMeta,
} = require('../utils/presensiFoto');
const { regenerateLaporanFilesIfExists } = require('./laporan.controller');

const LOCAL_AREAS = ['palu', 'sigi', 'donggala'];
const DEFAULT_GPS_TOLERANCE_METERS = Number.parseInt(
  process.env.PRESENSI_GPS_TOLERANCE_METERS || '150',
  10
);

const isLocalArea = (name) => {
  if (!name) return false;
  const lower = String(name).toLowerCase();
  return LOCAL_AREAS.some((area) => lower.includes(area));
};

function getDriveLink(file) {
  return file?.drive?.webContentLink || file?.drive?.webViewLink || null;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRadians = (deg) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function isWithinRadius(lat, lon, centerLat, centerLon, radiusMeters) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLon) ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return false;
  }

  return calculateDistanceMeters(lat, lon, centerLat, centerLon) <= radiusMeters;
}

function hasValidZone(daerah) {
  if (!daerah) return false;

  if (daerah.geojson) return true;

  return Boolean(
    toFiniteNumber(daerah.latitude) !== null &&
    toFiniteNumber(daerah.longitude) !== null &&
    toPositiveNumber(daerah.radius) !== null
  );
}

function evaluateTaggingZone(lat, lon, surat, daerah) {
  const toleranceMeters =
    Number.isFinite(DEFAULT_GPS_TOLERANCE_METERS) && DEFAULT_GPS_TOLERANCE_METERS >= 0
      ? DEFAULT_GPS_TOLERANCE_METERS
      : 150;

  const targetGeojson = daerah?.geojson || null;
  const insideGeojson = targetGeojson ? isPointInsideGeojson(lat, lon, targetGeojson) : false;

  const targetCenters = [
    {
      label: 'surat_tugas',
      lat: toFiniteNumber(surat?.latitude),
      lon: toFiniteNumber(surat?.longitude),
      radius: toPositiveNumber(surat?.radius),
    },
    {
      label: 'daerah',
      lat: toFiniteNumber(daerah?.latitude),
      lon: toFiniteNumber(daerah?.longitude),
      radius: toPositiveNumber(daerah?.radius),
    },
  ].filter((item) => item.lat !== null && item.lon !== null);

  const matchedRadius = targetCenters.find((item) =>
    isWithinRadius(lat, lon, item.lat, item.lon, (item.radius || 0) + toleranceMeters)
  );

  return {
    inside: insideGeojson || Boolean(matchedRadius),
    inside_geojson: insideGeojson,
    matched_radius_source: matchedRadius?.label || null,
    tolerance_meters: toleranceMeters,
  };
}

function calculateDurasiHari(tanggalMulai, tanggalSelesai) {
  const start = new Date(tanggalMulai);
  const end = new Date(tanggalSelesai);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function buildPresensiResponseItem(presensi, hariKe) {
  const raw = typeof presensi?.toJSON === 'function' ? presensi.toJSON() : presensi;
  const meta = parseFotoMeta(raw?.foto);
  const fotoList = meta.photos;
  const isFotoLengkap = isPresensiFotoLengkap(raw?.foto);
  const hasLaporan = typeof raw?.laporan === 'string' && raw.laporan.trim() !== '';

  return {
    ...raw,
    foto: fotoList[0] || null,
    foto_list: fotoList,
    force_foto_by_admin: meta.force_foto_by_admin,
    force_foto_reason: meta.force_foto_reason,
    force_foto_at: meta.force_foto_at,
    force_foto_admin_nama: meta.force_foto_admin_nama,
    hari_ke: hariKe,
    is_foto_lengkap: isFotoLengkap,
    can_submit_laporan: isFotoLengkap,
    status_presensi: hasLaporan
      ? 'laporan_selesai'
      : isFotoLengkap
        ? 'siap_laporan'
        : 'foto_belum_lengkap',
  };
}

exports.listPresensiSaya = async (req, res) => {
  try {
    const rows = await Presensi.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: SuratTugas,
        as: 'surat_tugas',
        required: false,
        attributes: [
          'id',
          'nomor_surat',
          'nama_kegiatan',
          'daerah_tujuan',
          'tanggal_mulai',
          'tanggal_selesai',
        ],
      }],
      order: [
        ['tanggal_presensi', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    const totalBySurat = rows.reduce((totals, row) => {
      const key = String(row.surat_tugas_id);
      totals[key] = (totals[key] || 0) + 1;
      return totals;
    }, {});

    const result = rows.map((row) => {
      const key = String(row.surat_tugas_id);
      const item = buildPresensiResponseItem(row, totalBySurat[key]);
      totalBySurat[key] -= 1;
      return item;
    });

    return res.json(result);
  } catch (err) {
    console.error('Error listPresensiSaya:', err);
    return res.status(500).json({
      message: 'Gagal mengambil riwayat presensi',
    });
  }
};

// Method untuk absen awal (foto + lokasi)
exports.presensiDinas = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;

    const today = getTodayDate();

    const uploadedFiles = Array.isArray(req.files) && req.files.length > 0
      ? req.files
      : req.file
        ? [req.file]
        : [];

    const fotoListIncoming = uploadedFiles
      .map((file) => getDriveLink(file) || file?.filename || null)
      .filter(Boolean);
    const fotoPrimaryIncoming = fotoListIncoming[0] || null;

    // Cari surat tugas aktif
    const surat = await SuratTugas.findOne({
      where: {
        user_id: userId,
        status: 'AKTIF',
        tanggal_mulai: { [Op.lte]: today },
        tanggal_selesai: { [Op.gte]: today },
      },
    });

    if (!surat) {
      return res.status(403).json({
        message: 'Tidak ada surat tugas aktif hari ini',
      });
    }

    // Hitung hari ke berapa hari ini berdasarkan tanggal mulai surat
    const tanggalMulai = new Date(surat.tanggal_mulai);
    tanggalMulai.setHours(0, 0, 0, 0);
    
    const hariIni = new Date(today);
    hariIni.setHours(0, 0, 0, 0);
    
    const selisihHari = Math.floor((hariIni - tanggalMulai) / (1000 * 60 * 60 * 24));
    const hariKe = selisihHari + 1;

    // Ambil semua presensi user untuk surat tugas ini
    const semuaPresensi = await Presensi.findAll({
      where: {
        user_id: userId,
        surat_tugas_id: surat.id
      },
      order: [['tanggal_presensi', 'ASC']]
    });

    // Buat mapping tanggal yang sudah absen
    const tanggalSudahAbsen = {};
    semuaPresensi.forEach((p, index) => {
      tanggalSudahAbsen[p.tanggal_presensi] = {
        urutan: index + 1, // Ini adalah hari ke berdasarkan urutan
        data: p
      };
    });

    // Kalau sudah ada presensi hari ini: izinkan upload foto tambahan sampai minimal 2 foto tercapai.
    // Ini jadi solusi untuk UI yang hanya bisa kirim 1 foto per aksi (tanpa tombol save per foto).
    const presensiHariIni = tanggalSudahAbsen[today]?.data || null;
    if (presensiHariIni) {
      const existingMeta = parseFotoMeta(presensiHariIni.foto);
      const existingFotoList = existingMeta.photos;

      if (existingFotoList.length >= 2) {
        return res.status(409).json({
          message: `Anda sudah melakukan presensi untuk hari ke-${tanggalSudahAbsen[today].urutan}`,
          sudah_absen: true,
          hari_ke: tanggalSudahAbsen[today].urutan,
          data: {
            ...(typeof presensiHariIni.toJSON === 'function' ? presensiHariIni.toJSON() : presensiHariIni),
            foto: existingFotoList[0] || null,
            foto_list: existingFotoList,
          }
        });
      }

      const mergedFotoList = [...existingFotoList, ...fotoListIncoming].filter(Boolean);
      const uniqueMerged = Array.from(new Set(mergedFotoList));

      if (uniqueMerged.length > 5) {
        return res.status(400).json({
          message: 'Maksimal 5 foto untuk 1 presensi.',
          max_foto: 5,
          total_foto: uniqueMerged.length,
        });
      }

      presensiHariIni.foto = serializeFotoMeta({
        ...existingMeta,
        photos: uniqueMerged,
      });
      await presensiHariIni.save();

      const isFotoLengkap = isPresensiFotoLengkap(presensiHariIni.foto);
      return res.status(isFotoLengkap ? 200 : 202).json({
        message: isFotoLengkap
          ? 'Foto presensi berhasil dilengkapi.'
          : 'Foto pertama tersimpan. Silakan kirim foto kedua untuk melengkapi presensi.',
        data: {
          ...(typeof presensiHariIni.toJSON === 'function' ? presensiHariIni.toJSON() : presensiHariIni),
          foto: uniqueMerged[0] || fotoPrimaryIncoming,
          foto_list: uniqueMerged,
          force_foto_by_admin: existingMeta.force_foto_by_admin,
          is_foto_lengkap: isFotoLengkap,
          remaining_foto: Math.max(0, 2 - uniqueMerged.length),
        },
        drive_file: uploadedFiles[0]?.drive || null,
        drive_files: uploadedFiles.map((f) => f?.drive).filter(Boolean),
        hari_ke: tanggalSudahAbsen[today].urutan,
        can_submit_laporan: isFotoLengkap,
        received_foto: uniqueMerged.length,
        min_foto: 2,
      });
    }

    // Pastikan presensi sebelumnya sudah lengkap (minimal 2 foto atau di-unlock admin) sebelum lanjut hari berikutnya.
    if (semuaPresensi.length > 0) {
      const lastPresensi = semuaPresensi[semuaPresensi.length - 1];
      const lastTanggal = lastPresensi?.tanggal_presensi;
      const lastFotoList = parseFotoList(lastPresensi?.foto);
      const lastFotoLengkap = isPresensiFotoLengkap(lastPresensi?.foto);

      if (lastTanggal && lastTanggal !== today && !lastFotoLengkap) {
        return res.status(400).json({
          message: `Lengkapi minimal 2 foto untuk presensi hari ke-${semuaPresensi.length} terlebih dahulu.`,
          min_foto: 2,
          received_foto: lastFotoList.length,
          pending_hari_ke: semuaPresensi.length,
          pending_tanggal: lastTanggal,
        });
      }
    }

    // Cek apakah ini hari yang sesuai (tidak boleh loncat)
    const expectedHariKe = Object.keys(tanggalSudahAbsen).length + 1;
    if (hariKe !== expectedHariKe) {
      return res.status(400).json({
        message: `Anda harus mengisi absen untuk hari ke-${expectedHariKe} terlebih dahulu`,
        expected_hari_ke: expectedHariKe,
        current_hari_ke: hariKe
      });
    }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return res.status(400).json({ message: 'Koordinat tidak valid' });
    }

    const daerah = await Daerah.findByPk(surat.daerah_id);
    if (!hasValidZone(daerah)) {
      return res.status(403).json({
        message: 'Area daerah belum tersedia',
      });
    }

    const zoneResult = evaluateTaggingZone(latNum, lonNum, surat, daerah);
    let inside = zoneResult.inside;
    const durasiHari = calculateDurasiHari(surat.tanggal_mulai, surat.tanggal_selesai);

    if (
      !inside &&
      (hariKe === 1 || hariKe === durasiHari) &&
      !isLocalArea(surat.daerah_tujuan)
    ) {
      const palu = await Daerah.findOne({
        where: {
          nama_daerah: { [Op.iLike]: '%Palu%' },
        },
      });
      if (palu) {
        inside = evaluateTaggingZone(latNum, lonNum, surat, palu).inside;
      }
    }

    if (!inside) {
      return res.status(403).json({
        message: 'Kamu berada di luar area tagging, silakan ke area tagging.',
        min_tolerance_meters: zoneResult.tolerance_meters,
      });
    }

    const fotoList = fotoListIncoming;
    const fotoPrimary = fotoPrimaryIncoming;

    // Simpan presensi (tanpa laporan)
    const presensi = await Presensi.create({
      user_id: userId,
      surat_tugas_id: surat.id,
      latitude: latNum,
      longitude: lonNum,
      // Simpan multiple foto dalam 1 field (JSON array string).
      // Untuk kompatibilitas response, kita tetap expose `foto` sebagai foto pertama.
      foto: fotoList.length ? JSON.stringify(fotoList) : null,
      laporan: null,
      tanggal_presensi: today,
      jam_presensi: new Date().toLocaleTimeString('id-ID')
    });

    res.status(fotoList.length >= 2 ? 201 : 202).json({
      message: fotoList.length >= 2
        ? `Absen hari ke-${hariKe} berhasil, silakan isi laporan`
        : `Foto pertama tersimpan untuk absen hari ke-${hariKe}. Silakan kirim foto kedua untuk melengkapi presensi.`,
      data: {
        ...presensi.toJSON(),
        foto: fotoPrimary,
        foto_list: fotoList,
        is_foto_lengkap: fotoList.length >= 2,
        remaining_foto: Math.max(0, 2 - fotoList.length),
      },
      drive_file: uploadedFiles[0]?.drive || null,
      drive_files: uploadedFiles.map((f) => f?.drive).filter(Boolean),
      hari_ke: hariKe,
      can_submit_laporan: fotoList.length >= 2,
      received_foto: fotoList.length,
      min_foto: 2,
    });
  } catch (err) {
    console.error('Error presensiDinas:', err);
    res.status(500).json({ message: err.message });
  }
};

// Method untuk update laporan
exports.updateLaporan = async (req, res) => {
  try {
    const { laporan, presensi_id, surat_tugas_id } = req.body;
    const userId = req.user.id;
    const presensiId = req.params.presensiId || presensi_id;

    if (!laporan) {
      return res.status(400).json({
        message: 'Laporan tidak boleh kosong'
      });
    }

    // Cari presensi milik user
    const presensi = await Presensi.findOne({
      where: presensiId
        ? {
            id: presensiId,
            user_id: userId,
          }
        : {
            user_id: userId,
            ...(surat_tugas_id ? { surat_tugas_id } : {}),
            tanggal_presensi: getTodayDate(),
          },
      order: [['id', 'DESC']],
    });

    if (!presensi) {
      return res.status(404).json({
        message: 'Data presensi tidak ditemukan'
      });
    }

    const context = await getOwnedReportContext({
      suratId: presensi.surat_tugas_id,
      userId,
    });
    assertReportEditable(context.reportWindow);

    const meta = parseFotoMeta(presensi.foto);
    const fotoList = meta.photos;
    const isFotoLengkap = isPresensiFotoLengkap(presensi.foto);
    if (!isFotoLengkap) {
      return res.status(400).json({
        message: 'Upload minimal 2 foto sebelum mengisi laporan.',
        min_foto: 2,
        received_foto: fotoList.length,
      });
    }

    // Update laporan
    presensi.laporan = laporan;
    await presensi.save();

    const regen = await regenerateLaporanFilesIfExists({
      userId,
      suratId: presensi.surat_tugas_id,
      surat: context?.surat || null,
      laporan: context?.laporan || null,
    });

    res.json({
      message: regen.regenerated
        ? 'Laporan berhasil disimpan dan dokumen akhir telah diperbarui'
        : 'Laporan berhasil disimpan',
      regenerated: regen.regenerated,
      data: {
        ...presensi.toJSON(),
        foto: fotoList[0] || null,
        foto_list: fotoList,
        force_foto_by_admin: meta.force_foto_by_admin,
        is_foto_lengkap: true,
      }
    });
  } catch (err) {
    const isKnownError = Number.isInteger(err.status) && err.code;
    if (!isKnownError) console.error('Error updateLaporan:', err);
    res.status(isKnownError ? err.status : 500).json({
      code: isKnownError ? err.code : 'INTERNAL_SERVER_ERROR',
      message: isKnownError ? err.message : 'Gagal menyimpan laporan harian.',
      ...(err.reportWindow ? { report_window: err.reportWindow } : {}),
    });
  }
};

// Method untuk cek status presensi
exports.cekPresensiHariIni = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTodayDate();

    // Cari surat tugas aktif
    const suratAktif = await SuratTugas.findOne({
      where: {
        user_id: userId,
        status: 'AKTIF',
        tanggal_mulai: { [Op.lte]: today },
        tanggal_selesai: { [Op.gte]: today }
      }
    });

    if (!suratAktif) {
      const suratUpcoming = await SuratTugas.findOne({
        where: {
          user_id: userId,
          status: 'AKTIF',
          tanggal_mulai: { [Op.gt]: today },
        },
        order: [['tanggal_mulai', 'ASC']],
      });

      if (suratUpcoming) {
        const start = new Date(suratUpcoming.tanggal_mulai);
        start.setHours(0, 0, 0, 0);
        const todayDate = new Date(today);
        todayDate.setHours(0, 0, 0, 0);
        const daysUntilStart = Math.max(
          0,
          Math.ceil((start - todayDate) / (1000 * 60 * 60 * 24))
        );

        return res.json({
          success: true,
          sudah_absen: false,
          sudah_laporan: false,
          data: [],
          message: `Surat tugas belum aktif, mulai ${daysUntilStart} hari lagi`,
          status_perjadin: 'belum_aktif',
          days_until_start: daysUntilStart,
          surat_tugas: {
            id: suratUpcoming.id,
            nomor_surat: suratUpcoming.nomor_surat,
            nama_kegiatan: suratUpcoming.nama_kegiatan,
            daerah_tujuan: suratUpcoming.daerah_tujuan,
            tanggal_mulai: suratUpcoming.tanggal_mulai,
            tanggal_selesai: suratUpcoming.tanggal_selesai,
          },
        });
      }

      return res.json({
        success: true,
        sudah_absen: false,
        sudah_laporan: false,
        data: [],
        message: 'Tidak ada surat tugas aktif',
        status_perjadin: 'tidak_ada',
      });
    }

    // Hitung hari ke berapa hari ini berdasarkan tanggal mulai surat
    const tanggalMulai = new Date(suratAktif.tanggal_mulai);
    tanggalMulai.setHours(0, 0, 0, 0);
    
    const hariIni = new Date(today);
    hariIni.setHours(0, 0, 0, 0);
    
    const selisihHari = Math.floor((hariIni - tanggalMulai) / (1000 * 60 * 60 * 24));
    const hariKeSekarang = selisihHari + 1;

    // Ambil semua presensi user untuk surat tugas ini
    const semuaPresensi = await Presensi.findAll({
      where: {
        user_id: userId,
        surat_tugas_id: suratAktif.id
      },
      include: [{
        model: SuratTugas,
        as: 'surat_tugas',
        required: false,
        attributes: ['id', 'nomor_surat', 'nama_kegiatan', 'daerah_tujuan', 'tanggal_mulai', 'tanggal_selesai']
      }],
      order: [['tanggal_presensi', 'ASC']]
    });

    const tanggalSelesai = new Date(suratAktif.tanggal_selesai);
    tanggalSelesai.setHours(0, 0, 0, 0);
    const durasiHari = Math.floor((tanggalSelesai - tanggalMulai) / (1000 * 60 * 60 * 24)) + 1;
    const totalPresensiSurat = Array.isArray(semuaPresensi) ? semuaPresensi.length : 0;
    const isSelesai = durasiHari > 0 && totalPresensiSurat >= durasiHari;

    // Buat mapping hari ke berdasarkan urutan
    const presensiDenganHariKe = semuaPresensi.map((p, index) =>
      buildPresensiResponseItem(p, index + 1)
    );

    // Filter untuk hari ini
    const presensiHariIni = presensiDenganHariKe.filter(p => 
      p.tanggal_presensi === today
    );

    const sudahAbsen = presensiHariIni.length > 0;
    const sudahLaporan = presensiHariIni.some(p => p.laporan && p.laporan.trim() !== '');

    // Ambil data untuk hari ini (yang pertama)
    const dataHariIni = presensiHariIni.length > 0 ? presensiHariIni[0] : null;
    const isFotoLengkapHariIni = Boolean(dataHariIni?.is_foto_lengkap);
    const canSubmitLaporan = sudahAbsen && isFotoLengkapHariIni;
    const presensiBelumLengkap = presensiDenganHariKe.find((item) => !item.is_foto_lengkap) || null;

    res.json({
      success: true,
      sudah_absen: sudahAbsen,
      sudah_laporan: sudahLaporan,
      is_foto_lengkap_hari_ini: isFotoLengkapHariIni,
      can_submit_laporan: canSubmitLaporan,
      data: presensiDenganHariKe,
      data_hari_ini: dataHariIni,
      ada_presensi_belum_lengkap: Boolean(presensiBelumLengkap),
      presensi_belum_lengkap: presensiBelumLengkap,
      hari_ke_sekarang: hariKeSekarang,
      total_presensi: presensiDenganHariKe.length,
      durasi_hari: durasiHari,
      is_selesai: isSelesai,
      status_perjadin: isSelesai ? 'selesai' : 'aktif',
      surat_tugas: {
        id: suratAktif.id,
        nomor_surat: suratAktif.nomor_surat,
        nama_kegiatan: suratAktif.nama_kegiatan,
        daerah_tujuan: suratAktif.daerah_tujuan,
        tanggal_mulai: suratAktif.tanggal_mulai,
        tanggal_selesai: suratAktif.tanggal_selesai
      }
    });

  } catch (err) {
    console.error('Error cekPresensiHariIni:', err);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memeriksa status presensi',
      error: err.message 
    });
  }
};

exports.listPresensiKendalaFotoAdmin = async (req, res) => {
  try {
    const includeUnlocked = String(req.query?.include_unlocked || '').toLowerCase() === 'true';

    const rows = await Presensi.findAll({
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          attributes: ['id', 'nama', 'nip', 'email', 'unit_kerja'],
        },
        {
          model: SuratTugas,
          as: 'surat_tugas',
          required: false,
          attributes: [
            'id',
            'nomor_surat',
            'nama_kegiatan',
            'daerah_tujuan',
            'tanggal_mulai',
            'tanggal_selesai',
            'status',
          ],
        },
      ],
      order: [
        ['tanggal_presensi', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    const problematicAll = [];
    for (const row of rows) {
      const raw = typeof row?.toJSON === 'function' ? row.toJSON() : row;
      const meta = parseFotoMeta(raw?.foto);
      // Hanya ambil presensi yang benar-benar tertahan di 1 foto (atau sudah di-force dari 1 foto)
      if (meta.photos.length !== 1) continue;

      problematicAll.push({
        id: raw.id,
        user_id: raw.user_id,
        surat_tugas_id: raw.surat_tugas_id,
        tanggal_presensi: raw.tanggal_presensi,
        jam_presensi: raw.jam_presensi,
        laporan: raw.laporan || null,
        has_laporan: Boolean(raw.laporan && String(raw.laporan).trim()),
        foto: meta.photos[0] || null,
        foto_list: meta.photos,
        foto_count: meta.photos.length,
        force_foto_by_admin: meta.force_foto_by_admin,
        force_foto_reason: meta.force_foto_reason,
        force_foto_at: meta.force_foto_at,
        force_foto_admin_nama: meta.force_foto_admin_nama,
        is_foto_lengkap: isPresensiFotoLengkap(raw?.foto),
        user: raw.user || null,
        surat_tugas: raw.surat_tugas || null,
      });
    }

    const pendingItems = problematicAll.filter((item) => !item.force_foto_by_admin);
    const unlockedItems = problematicAll.filter((item) => item.force_foto_by_admin);

    return res.json({
      success: true,
      pending_count: pendingItems.length,
      unlocked_count: unlockedItems.length,
      data: includeUnlocked ? [...pendingItems, ...unlockedItems] : pendingItems,
    });
  } catch (err) {
    console.error('Error listPresensiKendalaFotoAdmin:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat daftar presensi terkendala 1 foto',
    });
  }
};

exports.forceUnlockFotoAdmin = async (req, res) => {
  try {
    const presensiId = Number.parseInt(req.params.presensiId, 10);
    if (!Number.isInteger(presensiId) || presensiId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID presensi tidak valid',
      });
    }

    const presensi = await Presensi.findByPk(presensiId, {
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          attributes: ['id', 'nama', 'nip'],
        },
        {
          model: SuratTugas,
          as: 'surat_tugas',
          required: false,
          attributes: ['id', 'nomor_surat', 'nama_kegiatan', 'daerah_tujuan'],
        },
      ],
    });

    if (!presensi) {
      return res.status(404).json({
        success: false,
        message: 'Data presensi tidak ditemukan',
      });
    }

    const meta = parseFotoMeta(presensi.foto);
    if (meta.photos.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimal harus ada 1 foto presensi untuk dapat di-unlock oleh Admin',
      });
    }

    const forceFlag = req.body?.force !== undefined ? Boolean(req.body.force) : true;
    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim()
        : 'Kendala sistem/server saat upload foto kedua (di-unlock oleh Admin)';

    let adminNama = 'Admin';
    if (req.user?.id) {
      const adminUser = await User.findByPk(req.user.id, { attributes: ['id', 'nama'] });
      if (adminUser?.nama) adminNama = adminUser.nama;
    }

    presensi.foto = serializeFotoMeta({
      photos: meta.photos,
      force_foto_by_admin: forceFlag,
      force_foto_reason: forceFlag ? reason : null,
      force_foto_at: forceFlag ? new Date().toISOString() : null,
      force_foto_admin_id: forceFlag ? req.user?.id || null : null,
      force_foto_admin_nama: forceFlag ? adminNama : null,
    });

    await presensi.save();

    if (forceFlag && presensi.user_id) {
      try {
        await Notifikasi.create({
          user_id: presensi.user_id,
          judul: 'Presensi Di-unlock Admin (1 Foto)',
          pesan: `Presensi tanggal ${presensi.tanggal_presensi} (${presensi.surat_tugas?.daerah_tujuan || 'Perjalanan Dinas'}) telah di-unlock oleh Admin. Silakan isi laporan harian dan lanjutkan pengiriman laporan akhir.`,
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('Gagal mengirim notifikasi unlock presensi:', notifErr.message);
      }
    }

    const updatedMeta = parseFotoMeta(presensi.foto);
    return res.json({
      success: true,
      message: forceFlag
        ? 'Presensi berhasil di-unlock (1 foto disetujui Admin). Pegawai kini dapat mengisi laporan.'
        : 'Status unlock presensi telah dibatalkan.',
      data: {
        id: presensi.id,
        user_id: presensi.user_id,
        surat_tugas_id: presensi.surat_tugas_id,
        tanggal_presensi: presensi.tanggal_presensi,
        foto: updatedMeta.photos[0] || null,
        foto_list: updatedMeta.photos,
        force_foto_by_admin: updatedMeta.force_foto_by_admin,
        force_foto_reason: updatedMeta.force_foto_reason,
        force_foto_at: updatedMeta.force_foto_at,
        force_foto_admin_nama: updatedMeta.force_foto_admin_nama,
        is_foto_lengkap: isPresensiFotoLengkap(presensi.foto),
      },
    });
  } catch (err) {
    console.error('Error forceUnlockFotoAdmin:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status unlock presensi',
    });
  }
};
