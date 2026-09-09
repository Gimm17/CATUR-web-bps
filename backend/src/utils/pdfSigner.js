const { PDFDocument, rgb } = require('pdf-lib');
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
    throw new Error('Sumber file tidak ada');
  }

  if (isHttpUrl(source)) {
    return downloadUrlToBuffer(source);
  }

  if (!fs.existsSync(source)) {
    throw new Error(`File tidak ditemukan: ${source}`);
  }

  return fs.readFileSync(source);
}

async function embedSignatureImage(pdfDoc, signatureBytes, signatureSource = '') {
  const ext = path.extname(signatureSource).toLowerCase().split('?')[0];

  if (ext === '.png') {
    return pdfDoc.embedPng(signatureBytes);
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    return pdfDoc.embedJpg(signatureBytes);
  }

  try {
    return await pdfDoc.embedPng(signatureBytes);
  } catch (_) {
    return pdfDoc.embedJpg(signatureBytes);
  }
}

module.exports = async function signLaporanPDF({
  existingPdfPath,
  signatureSource,
  pegawai,
  surat,
  atasan,
  presensi,
  kesimpulan,
}) {
  const sourceLabel = existingPdfPath.split('?')[0];
  const outputPdfPath = path.join(__dirname, '../../uploads/pdf/signed-' + path.basename(sourceLabel));

  const existingPdfBytes = await readSourceToBuffer(existingPdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const signatureYPosition = 250;

  lastPage.drawText('Mengetahui,', {
    x: 50,
    y: signatureYPosition,
    size: 12,
    color: rgb(0, 0, 0),
  });

  lastPage.drawText(atasan.jabatan || 'Kepala BPS Provinsi Sulawesi Tengah', {
    x: 50,
    y: signatureYPosition - 15,
    size: 12,
    font: await pdfDoc.embedFont('Helvetica-Bold'),
    color: rgb(0, 0, 0),
  });

  if (signatureSource) {
    try {
      const signatureBytes = await readSourceToBuffer(signatureSource);
      const signatureImage = await embedSignatureImage(pdfDoc, signatureBytes, signatureSource);

      const maxWidth = 120;
      const maxHeight = 60;
      const imgDims = signatureImage.scaleToFit(maxWidth, maxHeight);
      const imageY = signatureYPosition - imgDims.height - 25;

      lastPage.drawImage(signatureImage, {
        x: 50 + (200 - imgDims.width) / 2,
        y: imageY,
        width: imgDims.width,
        height: imgDims.height,
      });

      const garisY = imageY - 15;
      lastPage.drawLine({
        start: { x: 50, y: garisY },
        end: { x: 250, y: garisY },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      const atasanNameY = garisY - 20;
      lastPage.drawText(atasan.nama || '........................................', {
        x: 50,
        y: atasanNameY,
        size: 12,
        color: rgb(0, 0, 0),
      });

      lastPage.drawText(`NIP. ${atasan.nip || '................................'}`, {
        x: 50,
        y: atasanNameY - 20,
        size: 12,
        color: rgb(0, 0, 0),
      });
    } catch (imageError) {
      console.error('Gagal memuat gambar tanda tangan:', imageError.message);
      fallbackToStandardSignature(lastPage, signatureYPosition, atasan);
    }
  } else {
    fallbackToStandardSignature(lastPage, signatureYPosition, atasan);
  }

  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  lastPage.drawText(`Palu, ${formattedDate}`, {
    x: 50,
    y: signatureYPosition + 30,
    size: 12,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdfPath, pdfBytes);
  return outputPdfPath;
};

function fallbackToStandardSignature(page, signatureYPosition, atasan) {
  page.drawLine({
    start: { x: 50, y: signatureYPosition - 80 },
    end: { x: 250, y: signatureYPosition - 80 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  const atasanNameY = signatureYPosition - 100;
  page.drawText(atasan.nama || '........................................', {
    x: 50,
    y: atasanNameY,
    size: 12,
    color: rgb(0, 0, 0),
  });

  page.drawText(`NIP. ${atasan.nip || '................................'}`, {
    x: 50,
    y: atasanNameY - 20,
    size: 12,
    color: rgb(0, 0, 0),
  });
}
