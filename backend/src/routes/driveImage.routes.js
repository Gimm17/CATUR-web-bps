const express = require('express');
const { getAuthorizedDriveClient } = require('../utils/googleDrive');

const router = express.Router();

const DEFAULT_SAMPLE_FILE_ID = '1A1B4G9mB5_wQrcijTrK18kxOcFk1t3SM';

async function streamDriveImage(res, fileId) {
  const drive = await getAuthorizedDriveClient();
  const driveRes = await drive.files.get(
    {
      fileId,
      alt: 'media',
      supportsAllDrives: true,
    },
    { responseType: 'stream' }
  );

  const contentType = driveRes.headers?.['content-type'] || 'image/jpeg';
  const contentLength = driveRes.headers?.['content-length'];
  const contentDisposition = driveRes.headers?.['content-disposition'] || 'inline';

  res.setHeader('Content-Type', contentType);
  if (contentLength) res.setHeader('Content-Length', contentLength);
  res.setHeader('Content-Disposition', contentDisposition);
  res.setHeader('Cache-Control', 'public, max-age=300');

  driveRes.data.pipe(res);
}

router.get('/drive/image/contoh', async (req, res) => {
  try {
    const fileId = process.env.GOOGLE_DRIVE_SAMPLE_FILE_ID || DEFAULT_SAMPLE_FILE_ID;
    await streamDriveImage(res, fileId);
  } catch (error) {
    console.error('Drive image proxy error (contoh):', error.message);
    res.status(403).json({
      success: false,
      message: 'Gagal mengambil gambar dari Google Drive',
      error: error.message,
    });
  }
});

router.get('/drive/image/:fileId', async (req, res) => {
  try {
    const fileId = String(req.params.fileId || '').trim();
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'fileId wajib diisi',
      });
    }

    await streamDriveImage(res, fileId);
  } catch (error) {
    console.error('Drive image proxy error (dynamic):', error.message);
    res.status(403).json({
      success: false,
      message: 'Gagal mengambil gambar dari Google Drive',
      error: error.message,
    });
  }
});

module.exports = router;
