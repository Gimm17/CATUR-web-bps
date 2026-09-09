const { uploadFileToDrive } = require('../utils/googleDrive');
const fs = require('fs');
const path = require('path');

function detectSubfolderPath(file) {
  const basePath = file?.destination
    ? file.destination
    : file?.path
      ? path.dirname(file.path)
      : '';

  if (!basePath) return '';

  const normalized = basePath.replace(/\\/g, '/');
  const marker = '/uploads/';
  const index = normalized.lastIndexOf(marker);
  if (index >= 0) {
    return normalized.slice(index + marker.length);
  }

  if (normalized.endsWith('/uploads')) {
    return '';
  }

  return path.basename(normalized);
}

module.exports = async function uploadToDrive(req, res, next) {
  try {
    if (!req.file && (!Array.isArray(req.files) || req.files.length === 0)) {
      return next();
    }

    if (req.file) {
      const driveFile = await uploadFileToDrive({
        filePath: req.file.path,
        fileName: req.file.filename,
        mimeType: req.file.mimetype,
        subfolderPath: detectSubfolderPath(req.file),
      });

      req.file.drive = driveFile;
      // Hapus file lokal setelah berhasil mirror ke Drive
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        req.file.localDeleted = true;
      }

      return next();
    }

    if (Array.isArray(req.files) && req.files.length > 0) {
      const filesWithDrive = [];
      for (const file of req.files) {
        const driveFile = await uploadFileToDrive({
          filePath: file.path,
          fileName: file.filename,
          mimeType: file.mimetype,
          subfolderPath: detectSubfolderPath(file),
        });

        file.drive = driveFile;
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          file.localDeleted = true;
        }
        filesWithDrive.push(file);
      }
      req.files = filesWithDrive;
    }

    return next();
  } catch (error) {
    console.error('Error upload ke Google Drive:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal upload file ke Google Drive',
      error: error.message,
    });
  }
};
