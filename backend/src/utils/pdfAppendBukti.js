const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function downloadUrlToBuffer(url) {
  const client = url.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(downloadUrlToBuffer(res.headers.location));
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Gagal download URL. Status: ${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function readSourceToBuffer(source) {
  if (!source) {
    throw new Error('Sumber PDF tidak tersedia');
  }

  if (isHttpUrl(source)) {
    return downloadUrlToBuffer(source);
  }

  if (!fs.existsSync(source)) {
    throw new Error(`File PDF tidak ditemukan: ${source}`);
  }

  return fs.readFileSync(source);
}

function getExtensionFromPathLike(value = '') {
  const cleaned = String(value).split('?')[0].split('#')[0];
  return path.extname(cleaned).toLowerCase();
}

function isImageLike(value, mimetype = '') {
  const ext = getExtensionFromPathLike(value);
  const imageExt = ['.jpg', '.jpeg', '.png', '.webp'];
  return (typeof mimetype === 'string' && mimetype.startsWith('image/')) || imageExt.includes(ext);
}

async function readLampiranToBuffer(itemUrl = '', itemFilename = '') {
  if (isHttpUrl(itemUrl)) {
    return downloadUrlToBuffer(itemUrl);
  }

  const localCandidates = [
    itemUrl,
    itemFilename ? path.join(process.cwd(), 'uploads/bukti-nota-pembayaran', itemFilename) : '',
    itemUrl ? path.join(process.cwd(), 'uploads/bukti-nota-pembayaran', itemUrl) : '',
    itemFilename ? path.join(__dirname, '../../uploads/bukti-nota-pembayaran', itemFilename) : '',
    itemUrl ? path.join(__dirname, '../../uploads/bukti-nota-pembayaran', itemUrl) : '',
  ].filter(Boolean);

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return fs.readFileSync(candidate);
    }
  }

  return null;
}

async function embedImageFlexible(pdfDoc, imageBytes) {
  try {
    return await pdfDoc.embedPng(imageBytes);
  } catch (_) {
    return pdfDoc.embedJpg(imageBytes);
  }
}

module.exports = async function appendBuktiPagesToSignedPDF({
  existingPdfPath,
  buktiPembayaran = [],
}) {
  const sourceLabel = String(existingPdfPath || '').split('?')[0];
  const outputPdfPath = path.join(
    __dirname,
    '../../uploads/pdf',
    `signed-nota-${Date.now()}-${path.basename(sourceLabel || 'laporan.pdf')}`
  );

  const existingPdfBytes = await readSourceToBuffer(existingPdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const orange = rgb(1, 0.4, 0);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.45, 0.45, 0.45);

  const now = new Date();
  const printedAt = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  for (let i = 0; i < buktiPembayaran.length; i++) {
    const item = buktiPembayaran[i] || {};
    const itemUrl = item.url || item.file || item.path || '';
    const itemName = item.name || item.filename || `Bukti ${i + 1}`;
    const itemMime = item.mimetype || '';

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawRectangle({
      x: margin,
      y: pageHeight - 70,
      width: pageWidth - margin * 2,
      height: 24,
      color: orange,
    });

    page.drawText('LAMPIRAN NOTA PERJALANAN DINAS', {
      x: margin + 8,
      y: pageHeight - 63,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText(`Halaman lampiran ${i + 1} - ${printedAt}`, {
      x: margin,
      y: pageHeight - 88,
      size: 10,
      font: fontRegular,
      color: gray,
    });

    page.drawText(`${i + 1}. ${itemName}`, {
      x: margin,
      y: pageHeight - 110,
      size: 11,
      font: fontBold,
      color: black,
    });

    if (isImageLike(itemUrl, itemMime)) {
      try {
        const imageBytes = await readLampiranToBuffer(itemUrl, item.filename || '');
        if (!imageBytes) {
          throw new Error('File gambar tidak ditemukan');
        }

        const image = await embedImageFlexible(pdfDoc, imageBytes);
        const imageDims = image.scale(1);
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - 170;
        const scale = Math.min(maxWidth / imageDims.width, maxHeight / imageDims.height, 1);
        const drawWidth = imageDims.width * scale;
        const drawHeight = imageDims.height * scale;
        const drawX = margin + (maxWidth - drawWidth) / 2;
        const drawY = pageHeight - 140 - drawHeight;

        page.drawImage(image, {
          x: drawX,
          y: Math.max(drawY, margin),
          width: drawWidth,
          height: drawHeight,
        });
      } catch (imgErr) {
        page.drawText(`Lampiran tidak bisa ditampilkan: ${imgErr.message}`, {
          x: margin,
          y: pageHeight - 140,
          size: 10,
          font: fontRegular,
          color: gray,
        });
      }
    } else {
      page.drawText('Lampiran non-gambar tercatat. Silakan cek file asli pada sistem.', {
        x: margin,
        y: pageHeight - 140,
        size: 10,
        font: fontRegular,
        color: gray,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);
  return outputPdfPath;
};
