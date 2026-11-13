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
const { parseFotoList } = require('./presensiFoto');
const { getAuthorizedDriveClient } = require('./googleDrive');

function getFotoCandidates(fotoValue) {
  return parseFotoList(fotoValue);
}

function decodeHtmlEntities(text = '') {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '--');
}

function parseInlineRuns(htmlFragment = '', baseStyle = {}) {
  const runs = [];
  const cleaned = String(htmlFragment || '')
    .replace(/<span[^>]*class=["'][^"']*ql-ui[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');

  const tokenRegex = /<(\/?)(strong|b|em|i|u|a|span|code)([^>]*)>|([^<]+)/gi;
  const state = {
    bold: Boolean(baseStyle.bold),
    italics: Boolean(baseStyle.italics),
    underline: Boolean(baseStyle.underline),
  };
  let match;

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    const [, closingSlash, tagNameRaw, , textNode] = match;
    if (textNode !== undefined) {
      const decoded = decodeHtmlEntities(textNode);
      if (decoded) {
        runs.push({
          text: decoded,
          bold: state.bold,
          italics: state.italics,
          underline: state.underline,
        });
      }
      continue;
    }

    const tag = String(tagNameRaw || '').toLowerCase();
    const isClosing = closingSlash === '/';
    if (tag === 'strong' || tag === 'b') state.bold = !isClosing;
    if (tag === 'em' || tag === 'i') state.italics = !isClosing;
    if (tag === 'u') state.underline = !isClosing;
  }

  return runs;
}

function stripLeadingListMarkerFromRuns(runs = [], isOrdered = true) {
  if (!runs.length) return runs;
  const cloned = runs.map((r) => ({ ...r }));
  const pattern = isOrdered ? /^\s*\d+[\.\)]\s+/ : /^\s*[•\-\*]\s+/;
  for (let i = 0; i < cloned.length; i += 1) {
    if (!cloned[i].text) continue;
    if (pattern.test(cloned[i].text)) {
      cloned[i].text = cloned[i].text.replace(pattern, '');
    }
    break;
  }
  return cloned;
}

function buildTextRuns(runDescriptors = []) {
  return runDescriptors
    .filter((r) => r && r.text)
    .map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: Boolean(r.bold),
          italics: Boolean(r.italics),
          ...(r.underline ? { underline: {} } : {}),
        })
    );
}

function htmlToWordParagraphs(html = '') {
  if (!html || typeof html !== 'string') {
    return [new Paragraph({ text: '-' })];
  }

  const normalized = html
    .replace(/\r\n/g, '\n')
    .replace(/<span[^>]*class=["'][^"']*ql-ui[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();

  if (!normalized) {
    return [new Paragraph({ text: '-' })];
  }

  const hasHtmlTags = /<(?:p|ol|ul|li|h[1-6]|div|blockquote|pre|strong|b|em|i|u)\b/i.test(normalized);
  const paragraphs = [];

  if (!hasHtmlTags) {
    const lines = decodeHtmlEntities(normalized)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) return [new Paragraph({ text: '-' })];

    for (const line of lines) {
      const isListLine = /^(\d+[\.\)]|[•\-\*])\s+/.test(line);
      paragraphs.push(
        new Paragraph({
          spacing: { before: 40, after: 80 },
          ...(isListLine ? { indent: { left: 360, hanging: 240 } } : {}),
          children: [new TextRun({ text: line })],
        })
      );
    }
    return paragraphs;
  }

  const blockRegex = /<(ol|ul|p|h[1-6]|blockquote|pre|div)[^>]*>([\s\S]*?)<\/\1>/gi;
  let blockMatch;
  let matchedAnyBlock = false;

  while ((blockMatch = blockRegex.exec(normalized)) !== null) {
    matchedAnyBlock = true;
    const tag = String(blockMatch[1] || '').toLowerCase();
    const innerHtml = blockMatch[2] || '';

    if (tag === 'ol' || tag === 'ul') {
      const liRegex = /<li([^>]*)>([\s\S]*?)<\/li>/gi;
      let liMatch;
      let orderedCounter = 1;
      let prevWasOrdered = null;

      while ((liMatch = liRegex.exec(innerHtml)) !== null) {
        const liAttrs = String(liMatch[1] || '');
        const liContent = String(liMatch[2] || '');

        let isOrdered = tag === 'ol';
        if (/data-list=["']bullet["']/i.test(liAttrs)) {
          isOrdered = false;
        } else if (/data-list=["']ordered["']/i.test(liAttrs)) {
          isOrdered = true;
        }

        if (prevWasOrdered !== null && prevWasOrdered !== isOrdered && isOrdered) {
          orderedCounter = 1;
        }
        prevWasOrdered = isOrdered;

        const subLines = liContent.split('\n');
        for (let lineIdx = 0; lineIdx < subLines.length; lineIdx += 1) {
          const rawRuns = parseInlineRuns(subLines[lineIdx]);
          const cleanedRuns =
            lineIdx === 0 ? stripLeadingListMarkerFromRuns(rawRuns, isOrdered) : rawRuns;
          const textContent = cleanedRuns.map((r) => r.text).join('').trim();
          if (!textContent) continue;

          const prefix =
            lineIdx === 0 ? (isOrdered ? `${orderedCounter++}. ` : '• ') : '   ';

          paragraphs.push(
            new Paragraph({
              indent: { left: 360, hanging: 240 },
              spacing: { before: 40, after: 60 },
              children: [new TextRun({ text: prefix }), ...buildTextRuns(cleanedRuns)],
            })
          );
        }
      }
      continue;
    }

    const isHeading = /^h[1-6]$/.test(tag);
    const subLines = innerHtml.split('\n');
    for (const subLine of subLines) {
      const runs = parseInlineRuns(subLine, { bold: isHeading });
      const textContent = runs.map((r) => r.text).join('').trim();
      if (!textContent) continue;

      const isManualList = /^(\d+[\.\)]|[•\-\*])\s+/.test(textContent);
      paragraphs.push(
        new Paragraph({
          spacing: { before: isHeading ? 120 : 40, after: 80 },
          ...(isManualList ? { indent: { left: 360, hanging: 240 } } : {}),
          children: buildTextRuns(runs),
        })
      );
    }
  }

  if (!matchedAnyBlock || !paragraphs.length) {
    const fallbackText = stripHtmlToText(normalized);
    const lines = fallbackText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) return [new Paragraph({ text: '-' })];

    return lines.map((line) => {
      const isListLine = /^(\d+[\.\)]|[•\-\*])\s+/.test(line);
      return new Paragraph({
        spacing: { before: 40, after: 80 },
        ...(isListLine ? { indent: { left: 360, hanging: 240 } } : {}),
        children: [new TextRun({ text: line })],
      });
    });
  }

  return paragraphs;
}

function stripHtmlToText(html = '') {
  if (!html || typeof html !== 'string') return '';

  let processedHtml = html
    .replace(/\r\n/g, '\n')
    .replace(/<span[^>]*class=["'][^"']*ql-ui[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');

  processedHtml = processedHtml.replace(
    /<(ol|ul)[^>]*>([\s\S]*?)<\/\1>/gi,
    (listMatch, listTag, listInner) => {
      const tag = String(listTag || '').toLowerCase();
      let orderedCounter = 1;
      let prevWasOrdered = null;

      const itemsText = String(listInner || '').replace(
        /<li([^>]*)>([\s\S]*?)<\/li>/gi,
        (liMatch, liAttrs, liContent) => {
          let isOrdered = tag === 'ol';
          if (/data-list=["']bullet["']/i.test(liAttrs)) {
            isOrdered = false;
          } else if (/data-list=["']ordered["']/i.test(liAttrs)) {
            isOrdered = true;
          }

          if (prevWasOrdered !== null && prevWasOrdered !== isOrdered && isOrdered) {
            orderedCounter = 1;
          }
          prevWasOrdered = isOrdered;

          let cleanContent = liContent
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]*>/g, '')
            .trim();

          if (isOrdered) {
            cleanContent = cleanContent.replace(/^\d+[\.\)]\s+/, '');
            return `${orderedCounter++}. ${cleanContent}\n`;
          }

          cleanContent = cleanContent.replace(/^[•\-\*]\s+/, '');
          return `- ${cleanContent}\n`;
        }
      );

      return `\n${itemsText}\n`;
    }
  );

  // Fallback jika ada <li> di luar <ol>/<ul>
  let fallbackCounter = 1;
  processedHtml = processedHtml.replace(/<li([^>]*)>([\s\S]*?)<\/li>/gi, (match, liAttrs, content) => {
    const isOrdered = /data-list=["']ordered["']/i.test(liAttrs);
    let cleanContent = content.replace(/<[^>]*>/g, '').trim();
    if (isOrdered) {
      cleanContent = cleanContent.replace(/^\d+[\.\)]\s+/, '');
      return `${fallbackCounter++}. ${cleanContent}\n`;
    }
    cleanContent = cleanContent.replace(/^[•\-\*]\s+/, '');
    return `- ${cleanContent}\n`;
  });

  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  processedHtml = processedHtml.replace(pRegex, (match, content) => {
    const cleanContent = content.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
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

async function downloadDriveFileBuffer(fileId) {
  if (!fileId) return null;
  try {
    const drive = await getAuthorizedDriveClient();
    const res = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    return res?.data ? Buffer.from(res.data) : null;
  } catch {
    return null;
  }
}

async function loadImageBuffer(candidates = []) {
  for (const filePath of candidates) {
    try {
      if (isHttpUrl(filePath)) {
        let buffer = null;
        try {
          buffer = await downloadUrlToBuffer(filePath);
        } catch {
          buffer = null;
        }
        let type = buffer ? detectImageType(buffer, path.extname(new URL(filePath).pathname)) : null;
        if (!type && filePath.includes('drive.google.com')) {
          const driveId = extractDriveId(filePath);
          const driveBuf = await downloadDriveFileBuffer(driveId);
          if (driveBuf) {
            buffer = driveBuf;
            type = detectImageType(buffer);
          }
        }
        if (buffer && type === 'webp') {
          const image = await Jimp.read(buffer);
          const converted = await image.getBufferAsync(Jimp.MIME_PNG);
          return { buffer: converted, type: 'png' };
        }
        if (!buffer || !type) continue;
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
        if (!type) continue;
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

    const kegiatanParagraphs = [
      ...htmlToWordParagraphs(p.kegiatan || p.laporan || p.catatan || '-'),
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
          new TableCell({
            width: { size: 7, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, text: String(i + 1) })],
          }),
          new TableCell({
            width: { size: 23, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph(String(tanggal))],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: kegiatanParagraphs,
          }),
        ],
      })
    );
  }

  const laporanTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [650, 2150, 6560],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            shading: { type: ShadingType.CLEAR, color: 'FFFFFF', fill: 'F2F2F2' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'No', bold: true })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 23, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            shading: { type: ShadingType.CLEAR, color: 'FFFFFF', fill: 'F2F2F2' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Tanggal', bold: true })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: { type: ShadingType.CLEAR, color: 'FFFFFF', fill: 'F2F2F2' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Kegiatan', bold: true })] })],
          }),
        ],
      }),
      ...(laporanRows.length ? laporanRows : [
        new TableRow({
          children: [
            new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, children: [new Paragraph('-')] }),
            new TableCell({ width: { size: 23, type: WidthType.PERCENTAGE }, children: [new Paragraph('-')] }),
            new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph('-')] }),
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
          ...htmlToWordParagraphs(kesimpulan || '-'),
          new Paragraph({ spacing: { after: 120 } }),

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
