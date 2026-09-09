const JimpModule = require('jimp');
const fs = require('fs');
const path = require('path');
const heicConvert = require('heic-convert');
const SuratTugas = require('../models/suratTugas.model');
const { Op } = require('sequelize');
const { findAdminAreas } = require('../utils/adminAreaLookup');

const Jimp = JimpModule.read
  ? JimpModule
  : (JimpModule.default?.read ? JimpModule.default : JimpModule.Jimp);

if (!Jimp || typeof Jimp.read !== 'function') {
  throw new Error('Jimp gagal diinisialisasi: method read tidak tersedia');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseHexColor(value, fallback) {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;

  // Terima format: "FFFFFFFF" / "0xFFFFFFFF"
  const normalized = raw.startsWith('0x') ? raw : `0x${raw}`;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMimeType(mimeType, filePath) {
  const normalizedMime = String(mimeType || '').toLowerCase().trim();
  if (normalizedMime.startsWith('image/')) {
    return normalizedMime;
  }

  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (ext === '.heic') return 'image/heic';
  if (ext === '.heif') return 'image/heif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return Jimp.MIME_PNG;
  if (ext === '.jpg' || ext === '.jpeg') return Jimp.MIME_JPEG;
  return Jimp.MIME_JPEG;
}

function shouldConvertToJpeg(mimeType, filePath) {
  const normalizedMime = normalizeMimeType(mimeType, filePath);
  return ![Jimp.MIME_JPEG, 'image/jpeg', 'image/jpg', Jimp.MIME_PNG, 'image/png'].includes(normalizedMime);
}

function isHeicLike(mimeType, filePath) {
  const normalizedMime = normalizeMimeType(mimeType, filePath);
  return normalizedMime === 'image/heic' || normalizedMime === 'image/heif';
}

async function convertHeicToJpegBuffer(imagePath) {
  const inputBuffer = await fs.promises.readFile(imagePath);
  return heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.9,
  });
}

async function convertFileToJpeg(file) {
  const imagePath = file?.path;
  if (!imagePath) {
    throw new Error('Path file upload tidak ditemukan');
  }

  let jpegBuffer = null;
  if (isHeicLike(file?.mimetype, imagePath)) {
    jpegBuffer = await convertHeicToJpegBuffer(imagePath);
  } else {
    const image = await readImageRobust(imagePath);
    image.quality(90);
    jpegBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  }

  const parsed = path.parse(imagePath);
  const nextPath = path.join(parsed.dir, `${parsed.name}.jpg`);

  await fs.promises.writeFile(nextPath, jpegBuffer);
  if (nextPath !== imagePath) {
    await fs.promises.unlink(imagePath).catch(() => {});
  }

  file.path = nextPath;
  file.filename = path.basename(nextPath);
  file.mimetype = Jimp.MIME_JPEG;
  file.size = jpegBuffer.length;
  if (file.originalname) {
    file.originalname = `${path.parse(file.originalname).name}.jpg`;
  }

  return nextPath;
}

function formatDateId(date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTimeId(date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatDayId(date) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'long',
  }).format(date);
}

async function getActiveSurat(userId) {
  const today = new Date().toISOString().split('T')[0];
  return SuratTugas.findOne({
    where: {
      user_id: userId,
      status: 'AKTIF',
      tanggal_mulai: { [Op.lte]: today },
      tanggal_selesai: { [Op.gte]: today },
    },
  });
}

async function normalizeStampCanvas(image) {
  const shouldNormalizeCanvas =
    !['0', 'false', 'no'].includes(String(process.env.STAMP_PRESENSI_CANVAS_NORMALIZE || '').toLowerCase());

  if (!shouldNormalizeCanvas) return image;

  // Default dibuat konsisten supaya timestamp selalu terbaca meski foto awal sangat besar.
  // Hindari upscaling: kalau foto kecil, kita pad ke canvas tanpa memperbesar.
  const canvasWidth = parsePositiveInt(process.env.STAMP_PRESENSI_CANVAS_WIDTH, 1280);
  const canvasHeight = parsePositiveInt(process.env.STAMP_PRESENSI_CANVAS_HEIGHT, 1280);
  const canvasBg = parseHexColor(process.env.STAMP_PRESENSI_CANVAS_BG, 0xffffffff);

  const srcWidth = image.bitmap?.width || canvasWidth;
  const srcHeight = image.bitmap?.height || canvasHeight;

  if (srcWidth <= 0 || srcHeight <= 0) return image;

  // Downscale jika lebih besar dari canvas.
  if (srcWidth > canvasWidth || srcHeight > canvasHeight) {
    image.scaleToFit(canvasWidth, canvasHeight);
  }

  // Pad ke ukuran canvas (tanpa upscaling).
  const scaledWidth = image.bitmap?.width || canvasWidth;
  const scaledHeight = image.bitmap?.height || canvasHeight;
  const offsetX = Math.floor((canvasWidth - scaledWidth) / 2);
  const offsetY = Math.floor((canvasHeight - scaledHeight) / 2);

  const canvas = await createSolidImage(canvasWidth, canvasHeight, canvasBg);
  canvas.composite(image, offsetX, offsetY);

  return canvas;
}

async function createSolidImage(width, height, background) {
  const safeWidth = Math.max(1, Number.parseInt(String(width), 10) || 1);
  const safeHeight = Math.max(1, Number.parseInt(String(height), 10) || 1);
  const safeBackground = Number.isFinite(background) ? background : 0xffffffff;

  if (typeof Jimp.create === 'function') {
    return Jimp.create(safeWidth, safeHeight, safeBackground);
  }

  return new Jimp(safeWidth, safeHeight, safeBackground);
}

async function resolveFontLayout(width, height, lines, maxTextWidthOverride) {
  const maxBoxHeight = Math.floor(height * 0.26);
  const maxTextWidth = maxTextWidthOverride || Math.floor(width * 0.92); // sisakan margin untuk padding

  // Mulai dari font lebih kecil agar tampilan tidak terlalu "gede".
  const candidates = [Jimp.FONT_SANS_32_WHITE, Jimp.FONT_SANS_16_WHITE].filter(Boolean);

  let lastFontData = null;
  let lastLayout = null;

  for (const candidate of candidates) {
    let fontData = null;
    try {
      fontData = await Jimp.loadFont(candidate);
    } catch (err) {
      continue;
    }

    const padding = clamp(Math.round(Math.min(width, height) * 0.016), 8, 32);
    const innerWidth = Math.max(1, maxTextWidth - padding * 2);
    const lineGap = clamp(Math.round(padding * 0.28), 3, 14);

    const lineHeights = lines.map((text) =>
      Math.max(1, Jimp.measureTextHeight(fontData, String(text), innerWidth))
    );
    const contentHeight = lineHeights.reduce((a, b) => a + b, 0) + lineGap * (lines.length - 1);
    const boxHeight = padding * 2 + contentHeight;

    lastFontData = fontData;
    lastLayout = { fontData, padding, innerWidth, lineGap, lineHeights, boxHeight };

    if (boxHeight <= maxBoxHeight) {
      return lastLayout;
    }
  }

  // Kalau semua kandidat terlalu besar, pakai yang paling kecil yang berhasil diload
  if (lastLayout) return lastLayout;

  // Fallback terakhir
  const fontData = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  const padding = clamp(Math.round(Math.min(width, height) * 0.016), 8, 32);
  const fallbackMaxTextWidth = maxTextWidthOverride || width;
  const innerWidth = Math.max(1, Math.floor(fallbackMaxTextWidth - padding * 2));
  const lineGap = clamp(Math.round(padding * 0.28), 3, 14);
  const lineHeights = lines.map((text) =>
    Math.max(1, Jimp.measureTextHeight(fontData, String(text), innerWidth))
  );
  const contentHeight = lineHeights.reduce((a, b) => a + b, 0) + lineGap * (lines.length - 1);
  const boxHeight = padding * 2 + contentHeight;
  return { fontData, padding, innerWidth, lineGap, lineHeights, boxHeight };
}

async function readImageRobust(imagePath) {
  try {
    return await Jimp.read(imagePath);
  } catch (pathError) {
    const buffer = await fs.promises.readFile(imagePath);
    return Jimp.read(buffer);
  }
}

async function writeImageRobust(image, imagePath, mimeType) {
  const normalizedMime = normalizeMimeType(mimeType, imagePath);

  if (normalizedMime === Jimp.MIME_PNG || normalizedMime === 'image/png') {
    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    await fs.promises.writeFile(imagePath, buffer);
    return;
  }

  image.quality(90);
  const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  await fs.promises.writeFile(imagePath, buffer);
}

module.exports = async function stampPresensiPhoto(req, res, next) {
  try {
    const files = Array.isArray(req.files) && req.files.length > 0
      ? req.files
      : req.file
        ? [req.file]
        : [];

    if (files.length === 0) {
      return next();
    }

    const { latitude, longitude } = req.body || {};
    const userId = req.user?.id;
    const surat = userId ? await getActiveSurat(userId) : null;
    const areas = findAdminAreas(latitude, longitude);
    const daerahLokasi = areas
      ? [areas.kecamatan, areas.kabupaten].filter(Boolean).join(', ')
      : null;
    const daerah = daerahLokasi || surat?.daerah_tujuan || '-';

    const now = new Date();
    const hari = formatDayId(now);
    const tanggal = formatDateId(now);
    const waktu = formatTimeId(now);
    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    const lat = Number.isFinite(latNum) ? latNum.toFixed(6) : (latitude ? String(latitude) : '-');
    const lon = Number.isFinite(lonNum) ? lonNum.toFixed(6) : (longitude ? String(longitude) : '-');

    const lines = [
      `Daerah: ${daerah}`,
      `Koordinat: ${lat}, ${lon}`,
      `Hari: ${hari}, ${tanggal}`,
      `Waktu Absen: ${waktu} WITA`,
    ];

    const failedFiles = [];

    for (const file of files) {
      if (!file?.path) continue;

      try {
        let imagePath = file.path;
        let incomingMime = normalizeMimeType(file.mimetype, imagePath);

        if (shouldConvertToJpeg(incomingMime, imagePath)) {
          imagePath = await convertFileToJpeg(file);
          incomingMime = Jimp.MIME_JPEG;
        }

        let image = await readImageRobust(imagePath);
        const shouldNormalizeExif =
          !['0', 'false', 'no'].includes(String(process.env.STAMP_PRESENSI_EXIF_NORMALIZE || '').toLowerCase());

        // Catatan: banyak kamera HP menyimpan orientasi lewat EXIF. Saat diproses & disimpan ulang,
        // metadata EXIF bisa hilang sehingga foto "terlihat miring" di hasil.
        // Normalisasi ini menjaga tampilan akhir sama seperti yang terlihat di galeri.
        if (shouldNormalizeExif && typeof image.exifRotate === 'function') {
          image.exifRotate();
        }

        image = await normalizeStampCanvas(image);

        const width = image.bitmap?.width || 1200;
        const height = image.bitmap?.height || 900;

        const panelMargin = clamp(Math.round(Math.min(width, height) * 0.018), 10, 28);
        const panelWidth = Math.max(1, width - panelMargin * 2);

        const layout = await resolveFontLayout(width, height, lines, panelWidth);
        const boxHeight = clamp(Math.ceil(layout.boxHeight), 1, height - panelMargin);

        const panelX = panelMargin;
        const panelY = height - boxHeight - panelMargin;

        // Panel yang lebih rapi: ada shadow + inset + aksen tipis.
        const shadowOffset = clamp(Math.round(panelMargin * 0.18), 2, 6);
        const shadow = await createSolidImage(panelWidth, boxHeight, 0x00000055);
        image.composite(shadow, panelX + shadowOffset, panelY + shadowOffset);

        const panel = await createSolidImage(panelWidth, boxHeight, 0x000000b8);
        image.composite(panel, panelX, panelY);

        const accentHeight = clamp(Math.round(boxHeight * 0.06), 3, 8);
        const accent = await createSolidImage(panelWidth, accentHeight, 0x2d9cdbcc);
        image.composite(accent, panelX, panelY);

        let currentY = panelY + layout.padding;
        for (let i = 0; i < lines.length; i += 1) {
          const text = lines[i];
          image.print(layout.fontData, panelX + layout.padding, currentY, {
            text,
            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
            alignmentY: Jimp.VERTICAL_ALIGN_TOP,
          }, layout.innerWidth);
          currentY += layout.lineHeights[i] + layout.lineGap;
        }

        await writeImageRobust(image, imagePath, incomingMime);
      } catch (fileErr) {
        console.error('stampPresensiPhoto file error:', fileErr.message, file?.originalname || file?.filename || file?.path);
        failedFiles.push(file?.originalname || file?.filename || file?.path || 'unknown-file');
      }
    }

    if (failedFiles.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Gagal menambahkan timestamp pada foto presensi. Silakan ambil ulang foto lalu kirim kembali.',
        failed_files: failedFiles,
      });
    }

    return next();
  } catch (err) {
    console.error('stampPresensiPhoto error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses timestamp foto presensi.',
      error: err.message,
    });
  }
};
