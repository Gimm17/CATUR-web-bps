const Presensi = require('../models/presensi.model');
const SuratTugas = require('../models/suratTugas.model');
const Daerah = require('../models/daerah.model');
const { isPointInsideGeojson } = require('../utils/geojsonPolygon');
const { getTodayDate } = require('../utils/date');
const { Op } = require('sequelize');

const LOCAL_AREAS = ['palu', 'sigi', 'donggala'];

const isLocalArea = (name) => {
  if (!name) return false;
  const lower = String(name).toLowerCase();
  return LOCAL_AREAS.some((area) => lower.includes(area));
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
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
};

const isWithinRadius = (lat, lon, centerLat, centerLon, radiusMeters) => {
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
};

const hasValidZone = (daerah) => {
  if (!daerah) return false;

  if (daerah.geojson) return true;

  return Boolean(
    toFiniteNumber(daerah.latitude) !== null &&
    toFiniteNumber(daerah.longitude) !== null &&
    toPositiveNumber(daerah.radius) !== null
  );
};

exports.presensiDinasService = async (userId, latitude, longitude, files) => {
  const today = getTodayDate();

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
    throw new Error('Tidak ada surat tugas aktif');
  }

  // Cek presensi hari ini
  const sudahPresensi = await Presensi.findOne({
    where: {
      user_id: userId,
      surat_tugas_id: surat.id,
      tanggal_presensi: today,
    },
  });

  if (sudahPresensi) {
    throw new Error('Anda sudah presensi hari ini');
  }

  const daerah = await Daerah.findByPk(surat.daerah_id);
  if (!hasValidZone(daerah)) {
    throw new Error('Area daerah belum tersedia');
  }

  const latNum = Number(latitude);
  const lonNum = Number(longitude);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    throw new Error('Koordinat tidak valid');
  }

  let inside = daerah.geojson
    ? isPointInsideGeojson(latNum, lonNum, daerah.geojson)
    : isWithinRadius(
        latNum,
        lonNum,
        Number(daerah.latitude),
        Number(daerah.longitude),
        Number(daerah.radius)
      );
  if (!inside) {
    const tanggalMulai = new Date(surat.tanggal_mulai);
    tanggalMulai.setHours(0, 0, 0, 0);
    const hariIni = new Date(today);
    hariIni.setHours(0, 0, 0, 0);
    const hariKe = Math.floor((hariIni - tanggalMulai) / (1000 * 60 * 60 * 24)) + 1;

    if (hariKe === 1 && !isLocalArea(surat.daerah_tujuan)) {
      const palu = await Daerah.findOne({
        where: {
          nama_daerah: { [Op.iLike]: '%Palu%' },
        },
      });
      if (hasValidZone(palu)) {
        inside = palu.geojson
          ? isPointInsideGeojson(latNum, lonNum, palu.geojson)
          : isWithinRadius(
              latNum,
              lonNum,
              Number(palu.latitude),
              Number(palu.longitude),
              Number(palu.radius)
            );
      }
    }
  }

  if (!inside) {
    throw new Error('Di luar area peta');
  }

  const uploadedFiles = Array.isArray(files) ? files : files ? [files] : [];
  const fotoList = uploadedFiles
    .map((file) => file?.drive?.webContentLink || file?.drive?.webViewLink || file?.filename || null)
    .filter(Boolean);

  const presensi = await Presensi.create({
    user_id: userId,
    surat_tugas_id: surat.id,
    latitude: latNum,
    longitude: lonNum,
    foto: fotoList.length ? JSON.stringify(fotoList) : null,
    tanggal_presensi: today,
    jam_presensi: new Date().toLocaleTimeString('id-ID'),
  });

  return presensi;
};
