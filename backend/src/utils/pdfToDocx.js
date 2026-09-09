const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveSofficePath() {
  // Allow explicit override for Windows installs where soffice isn't on PATH.
  // Example: SOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
  return process.env.SOFFICE_PATH || 'soffice';
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      windowsHide: true,
      ...opts,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += String(d)));
    child.stderr.on('data', (d) => (stderr += String(d)));

    child.on('error', (err) => {
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      const err = new Error(`soffice exited with code ${code}`);
      err.code = code;
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });
  });
}

module.exports = async function convertPdfToDocx({
  pdfPath,
  outDir,
  sofficePath,
}) {
  if (!pdfPath) throw new Error('pdfPath wajib diisi');
  if (!fileExists(pdfPath)) throw new Error(`PDF tidak ditemukan: ${pdfPath}`);

  const finalOutDir = outDir || path.dirname(pdfPath);
  if (!fs.existsSync(finalOutDir)) {
    fs.mkdirSync(finalOutDir, { recursive: true });
  }

  const soffice = sofficePath || resolveSofficePath();

  // LibreOffice will output <basename>.docx to outDir.
  const baseName = path.basename(pdfPath, path.extname(pdfPath));
  const expectedDocxPath = path.join(finalOutDir, `${baseName}.docx`);

  // Clean old output if any (avoid uploading stale file if conversion fails).
  if (fileExists(expectedDocxPath)) {
    try {
      fs.unlinkSync(expectedDocxPath);
    } catch {
      // ignore
    }
  }

  const args = [
    '--headless',
    '--nologo',
    '--nolockcheck',
    '--nodefault',
    '--nofirststartwizard',
    '--convert-to',
    'docx',
    '--outdir',
    finalOutDir,
    pdfPath,
  ];

  try {
    await run(soffice, args, { timeout: 120000 });
  } catch (err) {
    // Add a friendlier hint when soffice isn't installed/visible.
    const msg = String(err && (err.message || err));
    if (/ENOENT/i.test(msg) || /not recognized/i.test(msg)) {
      throw new Error(
        'Konversi PDF -> DOCX gagal karena LibreOffice (soffice) tidak ditemukan. ' +
          'Install LibreOffice di server, atau set env SOFFICE_PATH ke lokasi soffice.exe.'
      );
    }
    throw err;
  }

  if (!fileExists(expectedDocxPath)) {
    throw new Error('Konversi selesai tapi file DOCX tidak ditemukan (output LibreOffice tidak terbentuk).');
  }

  return {
    fileName: path.basename(expectedDocxPath),
    filePath: expectedDocxPath,
  };
};

