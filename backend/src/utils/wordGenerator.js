const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  ShadingType,
  BorderStyle,
  PageOrientation,
} = require('docx');
const https = require('https');
const http = require('http');
const Jimp = require('jimp');
const { buildReportBaseName } = require('./reportFilename');

function parseFotoList(fotoValue) {
  if (!fotoValue) return [];

  if (Array.isArray(fotoValue)) {
    return fotoValue.filter(Boolean).map(String);
  }

  if (typeof fotoValue === 'string') {
    const trimmed = fotoValue.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
      } catch (err) {
        // ignore
      }
    }

    return [trimmed];
  }

  return [];
}

function getFotoCandidates(fotoValue) {
  return parseFotoList(fotoValue);
}

function stripHtmlToText(html = '') {
  if (!html || typeof html !== 'string') return '';

  let processedHtml = html;

  if (processedHtml.includes('<ol>')) {
    processedHtml = processedHtml.replace(/<ol>/g, '\n');
    processedHtml = processedHtml.replace(/<\/ol>/g, '\n');
  }

  if (processedHtml.includes('<ul>')) {
    processedHtml = processedHtml.replace(/<ul>/g, '\n');
    processedHtml = processedHtml.replace(/<\/ul>/g, '\n');
  }

  const liRegex = /<li[^>]*>(?:<span[^>]*>)?(.*?)(?:<\/span>)?<\/li>/g;
  let orderedCounter = 1;

  processedHtml = processedHtml.replace(liRegex, (match, content) => {
    const isOrdered =
      match.includes('data-list="ordered"') ||
      (match.includes('ql-ui') &&
        processedHtml.substring(0, processedHtml.indexOf(match)).includes('<ol>'));

    const cleanContent = content.replace(/<[^>]*>/g, '').trim();

    if (isOrdered) {
      return `${orderedCounter++}. ${cleanContent}\n`;
    }

    return `- ${cleanContent}\n`;
  });

  const pRegex = /<p>(.*?)<\/p>/g;
  processedHtml = processedHtml.replace(pRegex, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent ? cleanContent + '\n\n' : '\n';
  });

  // Headings
  processedHtml = processedHtml.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent ? cleanContent + '\n\n' : '\n';
  });

  // Blockquote
  processedHtml = processedHtml.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent ? `> ${cleanContent}\n\n` : '\n';
  });

  // Pre / code blocks
  processedHtml = processedHtml.replace(/<pre[^>]*>(.*?)<\/pre>/gi, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '');
    return cleanContent ? `${cleanContent}\n\n` : '\n';
  });

  processedHtml = processedHtml.replace(/<code[^>]*>(.*?)<\/code>/gi, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '');
    return cleanContent;
  });

  // Links
  processedHtml = processedHtml.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (match, href, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent ? `${cleanContent} (${href})` : href;
  });

  processedHtml = processedHtml.replace(/<br\s*\/?>/g, '\n');

  const spanRegex = /<span[^>]*>(.*?)<\/span>/g;
  processedHtml = processedHtml.replace(spanRegex, (match, content) => {
    return content.replace(/<[^>]*>/g, '');
  });

  const divRegex = /<div>(.*?)<\/div>/g;
  processedHtml = processedHtml.replace(divRegex, (match, content) => {
    return content.replace(/<[^>]*>/g, '') + '\n';
  });

  processedHtml = processedHtml.replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, (match, tag, content) => {
    return content;
  });

  processedHtml = processedHtml.replace(/<(em|i)>(.*?)<\/(em|i)>/g, (match, tag, content) => {
    return content;
  });

  processedHtml = processedHtml.replace(/<u>(.*?)<\/u>/g, (match, content) => {
    return content;
  });

  processedHtml = processedHtml.replace(/<[^>]*>/g, '');

  processedHtml = processedHtml
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '--');

  processedHtml = processedHtml.replace(/\n\s*\n\s*\n/g, '\n\n');
  processedHtml = processedHtml.replace(/\n{3,}/g, '\n\n');

  return processedHtml.trim();
}

function formatDateId(value) {
  if (!value) return '-';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return '-';
  }
}

// Tambahan info koordinat & waktu presensi akan ditampilkan di laporan harian.

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function extractDriveId(value = '') {
  const normalized = String(value);
  const filePathMatch = normalized.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePathMatch?.[1]) return filePathMatch[1];
  const idQueryMatch = normalized.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch?.[1]) return idQueryMatch[1];
  return null;
}

function normalizeDownloadUrl(url = '') {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('drive.google.com')) {
    const id = extractDriveId(url);
    if (id) {
      return `https://drive.google.com/uc?id=${id}&export=download`;
    }
  }

  return url;
}

function downloadUrlToBuffer(url) {
  const normalized = normalizeDownloadUrl(url);

  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client
      .get(normalized, (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
          const nextUrl = new URL(res.headers.location, normalized).toString();
          res.resume();
          resolve(downloadUrlToBuffer(nextUrl));
          return;
        }

        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`Gagal download gambar: ${status}`));
          return;
        }

        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function detectImageType(buffer, fallbackExt = '') {
  const ext = String(fallbackExt || '').toLowerCase();
  if (ext === '.png') return 'png';
  if (ext === '.jpg' || ext === '.jpeg') return 'jpeg';
  if (ext === '.webp') return 'webp';

  if (buffer && buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'webp';
  }

  return null;
}

async function loadImageBuffer(candidates = []) {
  for (const filePath of candidates) {
    try {
      if (isHttpUrl(filePath)) {
        const buffer = await downloadUrlToBuffer(filePath);
        let type = detectImageType(buffer, path.extname(new URL(filePath).pathname));
        if (type === 'webp') {
          const image = await Jimp.read(buffer);
          const converted = await image.getBufferAsync(Jimp.MIME_PNG);
          return { buffer: converted, type: 'png' };
        }
        if (!type) return null;
        return { buffer, type };
      }

      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        let type = detectImageType(buffer, path.extname(filePath));
        if (type === 'webp') {
          const image = await Jimp.read(buffer);
          const converted = await image.getBufferAsync(Jimp.MIME_PNG);
          return { buffer: converted, type: 'png' };
        }
        if (!type) return null;
        return { buffer, type };
      }
    } catch {
      // skip
    }
  }
  return null;
}

function sectionHeader(text, color = 'FF6600') {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'FFFFFF', fill: color },
            borders: {
              top: { style: BorderStyle.NONE, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, color: 'FFFFFF' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({ text, bold: true, color: 'FFFFFF' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function labelValueRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [new Paragraph({ children: [new TextRun({ text: label })] })],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [new Paragraph({ children: [new TextRun({ text: `: ${value || '-'}` })] })],
      }),
    ],
  });
}

module.exports = async function generateLaporanWord({
  pegawai,
  surat,
  presensi = [],
  kesimpulan = '',
  bukti_pembayaran = [],
  ttd_pegawai = null,
}) {
  if (!pegawai || !surat) {
    throw new Error('Data pegawai dan surat wajib diisi');
  }

  const fileName = `${buildReportBaseName({ pegawai, surat })}-${Date.now()}.docx`;
  const dir = path.join(__dirname, '../../uploads/word');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, fileName);

  const logoLeft = await loadImageBuffer([
    path.join(__dirname, '../../uploads/logo.png'),
    path.join(__dirname, '../../uploads/logo.jpg'),
    path.join(__dirname, '../../uploads/logo.jpeg'),
    path.join(process.cwd(), 'uploads/logo.png'),
    path.join(process.cwd(), 'uploads/logo.jpg'),
    path.join(process.cwd(), 'uploads/logo.jpeg'),
  ]);

  const logoRight = await loadImageBuffer([
    path.join(__dirname, '../../uploads/sensus.png'),
    path.join(__dirname, '../../uploads/sensus.jpg'),
    path.join(__dirname, '../../uploads/sensus.jpeg'),
    path.join(process.cwd(), 'uploads/sensus.png'),
    path.join(process.cwd(), 'uploads/sensus.jpg'),
    path.join(process.cwd(), 'uploads/sensus.jpeg'),
  ]);

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              logoLeft
                ? new Paragraph({
                    children: [
                      new ImageRun({
                        data: logoLeft.buffer,
                        transformation: { width: 90, height: 90 },
                        type: logoLeft.type,
                      }),
                    ],
                  })
                : new Paragraph({ children: [new TextRun({ text: 'BPS', bold: true })] }),
            ],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'BADAN PUSAT STATISTIK', bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'PROVINSI SULAWESI TENGAH', bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Alamat : Jl. Prof. Mohammad Yamin, No. 48 Kota Palu', size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Homepage : sulteng.bps.go.id Email: bps7200@bps.go.id', size: 18 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              logoRight
                ? new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new ImageRun({
                        data: logoRight.buffer,
                        transformation: { width: 90, height: 65 },
                        type: logoRight.type,
                      }),
                    ],
                  })
                : new Paragraph({ children: [] }),
            ],
          }),
        ],
      }),
    ],
  });

  const garisOranye = new Paragraph({
    border: {
      bottom: {
        color: 'FF6600',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 8,
      },
    },
  });

  const judul = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({ text: 'LAPORAN PERJALANAN DINAS', bold: true, color: 'FF6600', size: 32 }),
    ],
  });

  const subJudul = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: surat.nama_kegiatan || 'KEGIATAN DINAS', bold: true, size: 26 }),
    ],
  });

  const nomorSurat = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: `Nomor Surat: ${surat.nomor_surat || '-'}`, color: '666666', size: 20 }),
    ],
  });

  const kopSurat = [
    new Paragraph({
      children: [new TextRun({ text: `Palu, ${formatDateId(new Date())}` })],
    }),
    new Paragraph({ text: 'Kepada Yang Terhormat :' }),
    new Paragraph({ text: 'Kepala BPS Provinsi Sulawesi Tengah', bold: true }),
    new Paragraph({ text: 'Di Palu' }),
  ];

  const pengantarText = surat.nama_kegiatan
    ? `Dengan ini disampaikan laporan perjalanan dinas untuk kegiatan ${surat.nama_kegiatan} guna untuk membantu dan menunjang kegiatan setiap harinya selama kegiatan perjalanan dinas berlangsung.`
    : 'Dengan ini disampaikan laporan perjalanan dinas guna untuk membantu dan menunjang kegiatan setiap harinya selama kegiatan perjalanan dinas berlangsung.';

  const identitasTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labelValueRow('Nama', pegawai.nama || '-'),
      labelValueRow('NIP', pegawai.nip || '-'),
      labelValueRow('Jabatan', pegawai.role || '-'),
      labelValueRow('Unit Kerja', pegawai.unit_kerja || '-'),
    ],
  });

  const infoKegiatanTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labelValueRow('Nama Kegiatan', surat.nama_kegiatan || '-'),
      labelValueRow('Tujuan Kegiatan', surat.tujuan_kegiatan || surat.daerah_tujuan || '-'),
      labelValueRow('Pembebanan Biaya', surat.pembebanan_biaya || '-'),
      labelValueRow('Nomor SPD', surat.nomor_surat || '-'),
      labelValueRow(
        'Tanggal Kegiatan',
        `${formatDateId(surat.tanggal_mulai)} s/d ${formatDateId(surat.tanggal_selesai)}`
      ),
      labelValueRow('Tempat Kegiatan', surat.daerah_tujuan || '-'),
    ],
  });

  const laporanRows = [];
  const presensiList = Array.isArray(presensi) ? presensi : [];

  for (let i = 0; i < presensiList.length; i += 1) {
    const p = presensiList[i];
    const tanggal = formatDateId(p.tanggal_presensi || p.created_at || p.createdAt);
    const laporanText = stripHtmlToText(p.kegiatan || p.laporan || p.catatan || '-') || '-';

    const kegiatanParagraphs = [
      new Paragraph({ text: laporanText }),
    ];

    const fotoList = getFotoCandidates(p?.foto);
    if (fotoList.length) {
      let fotoLoadedCount = 0;

      for (let fotoIndex = 0; fotoIndex < fotoList.length; fotoIndex += 1) {
        const fotoRef = fotoList[fotoIndex];
        const fotoBuffer = await loadImageBuffer([
          fotoRef,
          path.join(__dirname, '../../uploads/presensi', fotoRef),
          path.join(process.cwd(), 'uploads/presensi', fotoRef),
        ]);

        if (fotoBuffer) {
          fotoLoadedCount += 1;
          kegiatanParagraphs.push(
            new Paragraph({
              spacing: { before: 120, after: 60 },
              children: [
                new TextRun({ text: `Foto ${fotoIndex + 1}`, bold: true }),
              ],
            })
          );
          kegiatanParagraphs.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: fotoBuffer.buffer,
                  transformation: { width: 320, height: 220 },
                  type: fotoBuffer.type,
                }),
              ],
            })
          );
        }
      }

      if (!fotoLoadedCount) {
        kegiatanParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: 'Foto kegiatan tidak dapat dimuat di Word.', color: '666666' })],
          })
        );
      }
    }

    laporanRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(String(i + 1))] }),
          new TableCell({ children: [new Paragraph(String(tanggal))] }),
          new TableCell({ children: kegiatanParagraphs }),
        ],
      })
    );
  }

  const laporanTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'FFFFFF', fill: 'F2F2F2' },
            children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'FFFFFF', fill: 'F2F2F2' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Tanggal', bold: true })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'FFFFFF', fill: 'F2F2F2' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Kegiatan', bold: true })] })],
          }),
        ],
      }),
      ...(laporanRows.length ? laporanRows : [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('-')] }),
            new TableCell({ children: [new Paragraph('-')] }),
            new TableCell({ children: [new Paragraph('-')] }),
          ],
        }),
      ]),
    ],
  });

  const buktiList = Array.isArray(bukti_pembayaran) ? bukti_pembayaran : [];
  const buktiParagraphs = [];

  if (buktiList.length) {
    for (let idx = 0; idx < buktiList.length; idx += 1) {
      const b = buktiList[idx] || {};
      const name = b?.name || b?.filename || `Bukti ${idx + 1}`;

      buktiParagraphs.push(new Paragraph({ text: `${idx + 1}. ${name}` }));

      const candidates = [
        b?.url,
        b?.file,
        b?.path,
        b?.filename ? path.join(__dirname, '../../uploads/bukti-nota-pembayaran', b.filename) : '',
        b?.filename ? path.join(process.cwd(), 'uploads/bukti-nota-pembayaran', b.filename) : '',
      ].filter(Boolean);

      const lampiran = await loadImageBuffer(candidates);
      if (lampiran) {
        buktiParagraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: lampiran.buffer,
                transformation: { width: 220, height: 160 },
                type: lampiran.type,
              }),
            ],
          })
        );
      }
    }
  } else {
    buktiParagraphs.push(new Paragraph({ text: '-' }));
  }

  const ttdPegawaiBuffer = ttd_pegawai
    ? await loadImageBuffer([
        ttd_pegawai,
        path.join(__dirname, '../../uploads/ttd', ttd_pegawai),
        path.join(process.cwd(), 'uploads/ttd', ttd_pegawai),
      ])
    : null;

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [new Paragraph({ text: '' })],
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: 'Yang melaksanakan perjalanan dinas,', bold: true })],
              }),
              new Paragraph({ text: '', spacing: { before: 200, after: 200 } }),
              ttdPegawaiBuffer
                ? new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new ImageRun({
                        data: ttdPegawaiBuffer.buffer,
                        transformation: { width: 150, height: 60 },
                        type: ttdPegawaiBuffer.type,
                      }),
                    ],
                  })
                : new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    border: {
                      bottom: {
                        color: '000000',
                        space: 1,
                        style: BorderStyle.SINGLE,
                        size: 4,
                      },
                    },
                    children: [new TextRun({ text: ' ' })],
                  }),
              new Paragraph({ text: '', spacing: { before: 120 } }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: pegawai.nama || 'Tidak Ada Nama', bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `NIP. ${pegawai.nip || ''}` })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
            size: { orientation: PageOrientation.PORTRAIT },
          },
        },
        children: [
          headerTable,
          garisOranye,
          judul,
          subJudul,
          nomorSurat,
          ...kopSurat,
          new Paragraph({ text: pengantarText, spacing: { after: 200 } }),

          sectionHeader('I. IDENTITAS PEGAWAI'),
          identitasTable,

          new Paragraph({ spacing: { after: 200 } }),
          sectionHeader('II. INFORMASI KEGIATAN'),
          infoKegiatanTable,

          new Paragraph({ spacing: { after: 200 } }),
          sectionHeader('III. LAPORAN KEGIATAN HARIAN'),
          laporanTable,

          new Paragraph({ spacing: { after: 200 } }),
          sectionHeader('IV. KESIMPULAN DAN SARAN'),
          new Paragraph({ text: stripHtmlToText(kesimpulan) || '-', spacing: { after: 200 } }),

          sectionHeader('V. BUKTI NOTA / PENGELUARAN PERJALANAN DINAS'),
     
          ...buktiParagraphs,
          new Paragraph({ spacing: { after: 200 } }),
          signatureTable,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
  return fileName;
};
