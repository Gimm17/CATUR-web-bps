const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { buildReportBaseName } = require('./reportFilename');

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

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

async function resolvePresensiImageSource(fotoRef) {
  if (!fotoRef) return null;

  if (isHttpUrl(fotoRef)) {
    return downloadUrlToBuffer(fotoRef);
  }

  const localCandidates = [
    path.join(__dirname, '../../uploads/presensi', fotoRef),
    path.join(process.cwd(), 'uploads/presensi', fotoRef),
    fotoRef
  ];

  return localCandidates.find((candidate) => fs.existsSync(candidate)) || null;
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
          reject(new Error(`Gagal download file dari URL. Status: ${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function getExtensionFromPathLike(value) {
  if (!value || typeof value !== 'string') return '';
  const cleaned = value.split('?')[0].split('#')[0];
  return path.extname(cleaned).toLowerCase();
}

function isImageLike(value, mimetype = '') {
  const ext = getExtensionFromPathLike(value);
  const imageExt = ['.jpg', '.jpeg', '.png', '.webp'];
  return (typeof mimetype === 'string' && mimetype.startsWith('image/')) || imageExt.includes(ext);
}

// Fungsi untuk membersihkan HTML tags dan mengkonversi ke teks biasa
function stripHtmlTags(html) {
  if (!html) return '';
  
  // Hapus semua tag HTML
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  
  // Bersihkan multiple spasi dan newline
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Fungsi untuk memformat teks dari Quill Editor dengan benar
function formatRichText(doc, html, x, y, width) {
  if (!html) return y;
  
  let currentY = y;
  
  // Proses HTML dari Quill Editor
  let processedHtml = html;
  
  // Handle ordered list (<ol>)
  if (processedHtml.includes('<ol>')) {
    processedHtml = processedHtml.replace(/<ol>/g, '\n');
    processedHtml = processedHtml.replace(/<\/ol>/g, '\n');
  }
  
  // Handle unordered list (<ul>)
  if (processedHtml.includes('<ul>')) {
    processedHtml = processedHtml.replace(/<ul>/g, '\n');
    processedHtml = processedHtml.replace(/<\/ul>/g, '\n');
  }
  
  // Handle list items dengan format Quill
  const liRegex = /<li[^>]*>(?:<span[^>]*>)?(.*?)(?:<\/span>)?<\/li>/g;
  let orderedCounter = 1;
  let lastWasOrdered = false;
  
  processedHtml = processedHtml.replace(liRegex, (match, content) => {
    // Cek apakah ini bagian dari ordered list
    const isOrdered = match.includes('data-list="ordered"') || 
                     match.includes('ql-ui') && processedHtml.substring(0, processedHtml.indexOf(match)).includes('<ol>');
    
    // Hapus semua tag HTML dari konten
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    
    if (isOrdered) {
      return `${orderedCounter++}. ${cleanContent}\n`;
    } else {
      return `• ${cleanContent}\n`;
    }
  });
  
  // Handle paragraphs
  const pRegex = /<p>(.*?)<\/p>/g;
  processedHtml = processedHtml.replace(pRegex, (match, content) => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    return cleanContent ? cleanContent + '\n\n' : '\n';
  });
  
  // Handle line breaks
  processedHtml = processedHtml.replace(/<br\s*\/?>/g, '\n');
  
  // Handle spans (biasanya untuk styling)
  const spanRegex = /<span[^>]*>(.*?)<\/span>/g;
  processedHtml = processedHtml.replace(spanRegex, (match, content) => {
    return content.replace(/<[^>]*>/g, '');
  });
  
  // Handle divs
  const divRegex = /<div>(.*?)<\/div>/g;
  processedHtml = processedHtml.replace(divRegex, (match, content) => {
    return content.replace(/<[^>]*>/g, '') + '\n';
  });
  
  // Handle bold/strong
  processedHtml = processedHtml.replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, (match, tag, content) => {
    return content; // PDFKit tidak support bold di dalam text biasa
  });
  
  // Handle italic/em
  processedHtml = processedHtml.replace(/<(em|i)>(.*?)<\/(em|i)>/g, (match, tag, content) => {
    return content;
  });
  
  // Handle underline
  processedHtml = processedHtml.replace(/<u>(.*?)<\/u>/g, (match, content) => {
    return content;
  });
  
  // Hapus semua tag HTML yang tersisa
  processedHtml = processedHtml.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  processedHtml = processedHtml
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '--');
  
  // Bersihkan multiple newline
  processedHtml = processedHtml.replace(/\n\s*\n\s*\n/g, '\n\n');
  processedHtml = processedHtml.replace(/\n{3,}/g, '\n\n');
  
  // Split berdasarkan baris
  const lines = processedHtml.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimRight();
    
    if (line.trim()) {
      // Cek apakah ini list item (dimulai dengan • atau angka)
      const isBulletList = line.trim().startsWith('•');
      const isNumberedList = /^\d+\.\s/.test(line.trim());
      
      if (isBulletList || isNumberedList) {
        // Untuk list items, beri indentasi
        const indent = 20;
        const text = line.trim();
        
        doc.fontSize(11)
           .font('Helvetica')
           .text(text, x + indent, currentY, {
             width: width - indent,
             align: 'justify',
             lineGap: 5
           });
      } else {
        // Untuk paragraf biasa
        doc.fontSize(11)
           .font('Helvetica')
           .text(line, x, currentY, {
             width: width,
             align: 'justify',
             lineGap: 5
           });
      }
      
      currentY = doc.y + 8;
    } else {
      // Baris kosong (untuk jarak antar paragraf)
      currentY += 10;
    }
  }
  
  return currentY;
}

// Fungsi untuk memformat teks dengan word wrap yang baik
function formatWrappedText(doc, text, x, y, width, options = {}) {
  const defaultOptions = {
    fontSize: 12,
    font: 'Helvetica',
    lineGap: 5,
    align: 'left'
  };
  
  const opts = { ...defaultOptions, ...options };
  
  doc.fontSize(opts.fontSize)
     .font(opts.font)
     .text(text, x, y, {
       width: width,
       align: opts.align,
       lineGap: opts.lineGap
     });
  
  return doc.y;
}

// Tambahan info koordinat & waktu presensi akan ditampilkan di laporan harian.

function convertQuillHtmlToPlainText(html) {
  if (!html) return '-';

  let processedHtml = html;
  let orderedCounter = 1;

  processedHtml = processedHtml
    .replace(/<ol>/g, '\n')
    .replace(/<\/ol>/g, '\n')
    .replace(/<ul>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<li[^>]*>(?:<span[^>]*>)?(.*?)(?:<\/span>)?<\/li>/g, (match, content) => {
      const isOrdered = match.includes('data-list="ordered"') ||
        (match.includes('ql-ui') && processedHtml.substring(0, processedHtml.indexOf(match)).includes('<ol>'));
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();
      return isOrdered ? `${orderedCounter++}. ${cleanContent}\n` : `• ${cleanContent}\n`;
    })
    .replace(/<p>(.*?)<\/p>/g, (match, content) => {
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();
      return cleanContent ? cleanContent + '\n\n' : '\n';
    })
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<span[^>]*>(.*?)<\/span>/g, '$1')
    .replace(/<div>(.*?)<\/div>/g, '$1\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n');

  return processedHtml;
}

module.exports = async function generateLaporanPDF({
  pegawai,
  surat,
  presensi,
  kesimpulan,
  ttd_pegawai = null,
  bukti_pembayaran = [],
}) {
  // Validasi input
  if (!pegawai || !surat) {
    throw new Error('Data pegawai dan surat wajib diisi');
  }

  const fileName = `${buildReportBaseName({ pegawai, surat })}-${Date.now()}.pdf`;
  const dir = path.join(__dirname, '../../uploads/pdf');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, fileName);
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50
  });

  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Warna oranye BPS
  const orangeColor = '#FF6600';
  const grayColor = '#666666';
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  // 1. HEADER DENGAN LOGO BPS KIRI DAN KANAN
  const possibleLogoPathsLeft = [
    path.join(__dirname, '../../uploads/logo.png'),
  ];

  let logoLeftAdded = false;
  for (const logoPath of possibleLogoPathsLeft) {
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 20, { width: 100, height: 100 });
        logoLeftAdded = true;
        break;
      } catch (err) {
        console.log(`Gagal memuat logo kiri:`, err.message);
      }
    }
  }

  // LOGO KANAN - SENSUS EKONOMI
  const logoRightPath = path.join(__dirname, '../../uploads/sensus.png');
  console.log(`🔍 Mencari logo kanan di: ${logoRightPath}`);
  
  if (fs.existsSync(logoRightPath)) {
    console.log(`✅ File ditemukan, size: ${fs.statSync(logoRightPath).size} bytes`);
    try {
      doc.image(logoRightPath, doc.page.width - 170, 20, { 
        width: 130,
        height: 90 
      });
      console.log('✅ Logo sensus berhasil ditambahkan');
    } catch (err) {
      console.log(`❌ Gagal memuat logo kanan:`, err.message);
      try {
        doc.image(logoRightPath, doc.page.width - 140, 45, { 
          width: 70, 
          height: 70 
        });
        console.log('✅ Logo sensus berhasil ditambahkan (attempt 2)');
      } catch (err2) {
        console.log(`❌ Masih gagal:`, err2.message);
      }
    }
  } else {
    console.log(`❌ File logo kanan tidak ditemukan di: ${logoRightPath}`);
    
    const altPath = path.join(process.cwd(), 'uploads/sensus.png');
    console.log(`🔍 Mencoba path alternatif: ${altPath}`);
    
    if (fs.existsSync(altPath)) {
      try {
        doc.image(altPath, doc.page.width - 150, 40, { 
          width: 80, 
          height: 80 
        });
        console.log('✅ Logo sensus berhasil ditambahkan dari path alternatif');
      } catch (err) {
        console.log(`❌ Gagal memuat dari alternatif:`, err.message);
      }
    }
  }

  // Informasi BPS jika logo kiri tidak ada
  if (!logoLeftAdded) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor(orangeColor)
      .text('BPS', 60, 60);
    doc.fontSize(10).fillColor('black')
      .text('BADAN PUSAT STATISTIK', 50, 80, { width: 70, align: 'center' });
  }

  // Informasi BPS Provinsi (di tengah antara dua logo)
  doc.fontSize(12).font('Helvetica-Bold').fillColor('black')
     .text('BADAN PUSAT STATISTIK', 150, 40);
  
  doc.fontSize(12).font('Helvetica-Bold').fillColor('black')
     .text('PROVINSI SULAWESI TENGAH', 150, 60);
  
  doc.fontSize(8).font('Helvetica')
     .text('Alamat : Jl. Prof. Mohammad Yamin, No. 48 Kota Palu', 150, 76);
  
  doc.text('Homepage : sulteng.bps.go.id Email: bps7200@bps.go.id', 150, 87);
  
  // Garis pemisah header
  doc.lineWidth(1.5).strokeColor(orangeColor)
    .moveTo(50, 100)
    .lineTo(doc.page.width - 50, 100)
    .stroke();
  
  doc.moveDown(3);
  
  // Judul utama
  doc.fontSize(18).font('Helvetica-Bold').fillColor(orangeColor)
    .text('LAPORAN PERJALANAN DINAS', 160, 115);
    
  // Sub judul dengan nama kegiatan
  // Informasi nomor surat
  doc.fontSize(10).font('Helvetica').fillColor(grayColor)
    .text(`Nomor Surat: ${surat.nomor_surat || '-'}`, 190, 148);
  
  // Garis oranye di bawah judul
  doc.lineWidth(2).strokeColor(orangeColor)
    .moveTo(50, 175)
    .lineTo(doc.page.width - 50, 175)
    .stroke();
  
  doc.moveDown(1);
  
  // 2. KOP SURAT
  doc.fontSize(12).font('Helvetica').fillColor('black')
    .text(`Palu, ${formattedDate}`, 50, doc.y + 20);
  
  doc.moveDown(1);
  
  doc.text('Kepada Yang Terhormat :', 50, doc.y + 10);
  doc.font('Helvetica-Bold').fillColor('black')
    .text('Kepala BPS Provinsi Sulawesi Tengah', 50, doc.y+ 10);
  doc.font('Helvetica').fillColor('black')
    .text('Di Palu', 50, doc.y+ 10);
  
  doc.moveDown(1);
  
  // Teks pengantar
  const pengantarY = doc.y + 20;
  
  let teksPengantar = '';
  if (surat.nama_kegiatan) {
    teksPengantar = `Dengan ini disampaikan laporan perjalanan dinas untuk kegiatan ${surat.nama_kegiatan} guna untuk membantu dan menunjang kegiatan setiap harinya selama kegiatan perjalanan dinas berlangsung.`;
  } else {
    teksPengantar = 'Dengan ini disampaikan laporan perjalanan dinas guna untuk membantu dan menunjang kegiatan setiap harinya selama kegiatan perjalanan dinas berlangsung.';
  }
  
  doc.fontSize(12)
     .font('Helvetica')
     .fillColor('black');
  
  const teksWidth = doc.page.width - 100;
  
  doc.text(teksPengantar, 50, pengantarY, {
    width: teksWidth,
    align: 'justify',
    lineGap: 8
  });
  
  doc.moveDown(0.5);

  // 3. IDENTITAS PEGAWAI
  const sectionY = doc.y;
  
  doc.rect(50, sectionY, doc.page.width - 100, 25)
    .fill(orangeColor);
  
  doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
    .text('I. IDENTITAS PEGAWAI', 55, sectionY + 5);
  
  doc.fillColor('black');
  
  doc.fontSize(12).font('Helvetica')
    .text(`1. Nama                                : ${pegawai.nama || 'Tidak Ada'}`, 55, sectionY + 35);
  doc.text(`2. NIP                                    : ${pegawai.nip || 'Tidak Ada'}`, 55, sectionY + 55);
  doc.text(`3. Jabatan                             : ${pegawai.role || 'Tidak Ada'}`, 55, sectionY + 75);
  doc.text(`4. Unit Kerja                          : ${pegawai.unit_kerja || 'Tidak Ada'}`, 55, sectionY + 95);
  
  doc.y = sectionY + 120;

  // 4. INFORMASI KEGIATAN
  const kegiatanY = doc.y;
    
  doc.rect(50, kegiatanY, doc.page.width - 100, 25)
    .fill(orangeColor);
  
  doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
    .text('II. INFORMASI KEGIATAN', 55, kegiatanY + 5);
  
  doc.fillColor('black');
  doc.fontSize(12).font('Helvetica');
  
  const labelX = 55;
  const kontenX = 210;
  const kontenWidth = doc.page.width - 260;

  let currentYPos = kegiatanY + 35;

  // 1. Nama Kegiatan
  doc.text('1. Nama Kegiatan                : ', labelX, currentYPos);
  currentYPos = formatWrappedText(doc, surat.nama_kegiatan || '-', kontenX, currentYPos, kontenWidth);
  currentYPos += 10;

  // 2. Tujuan Kegiatan
  doc.text('2. Tujuan Kegiatan               : ', labelX, currentYPos);
  currentYPos = formatWrappedText(doc, surat.tujuan_kegiatan|| '-', kontenX, currentYPos, kontenWidth);
  currentYPos += 10;

  // 3. Pembebanan Biaya
  doc.text('3. Pembebanan Biaya         :  ', labelX, currentYPos);
  currentYPos = formatWrappedText(doc, surat.pembebanan_biaya || '-', kontenX, currentYPos, kontenWidth);
  currentYPos += 10;

  // 4. Nomor SPD
  doc.text('4. Nomor SPD                     :  ', labelX, currentYPos);
  currentYPos = formatWrappedText(doc, surat.nomor_surat || '-', kontenX, currentYPos, kontenWidth);
  currentYPos += 10;

  // 5. Tanggal Kegiatan
  doc.text('5. Tanggal Kegiatan             :  ', labelX, currentYPos);
  const tanggalText = `${surat.tanggal_mulai || '-'} s/d ${surat.tanggal_selesai || '-'}`;
  currentYPos = formatWrappedText(doc, tanggalText, kontenX, currentYPos, kontenWidth);
  currentYPos += 10;

  // 6. Tempat Kegiatan
  doc.text('6. Tempat Kegiatan             : ', labelX, currentYPos);
  currentYPos = formatWrappedText(doc, surat.daerah_tujuan || '-', kontenX, currentYPos, kontenWidth);

  doc.y = currentYPos + 20;

// 5. LAPORAN KEGIATAN HARIAN - Halaman Baru
doc.addPage();

const laporanY = 50;

doc.rect(50, laporanY, doc.page.width - 100, 25)
  .fill(orangeColor);

doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
  .text('III. LAPORAN KEGIATAN HARIAN', 55, laporanY + 5);

doc.fillColor('black');
doc.y = laporanY + 35;

// Tabel laporan harian - UKURAN DIPERBAIKI
const tableTop = doc.y;
const rowHeight = 30;
const columnWidths = [40, 100, 360]; // No: 40px, Tanggal: 100px, Kegiatan: 360px
const xPositions = [50, 90, 190]; // Posisi X yang disesuaikan
const tableWidth = 490; // Total lebar tabel

// Header Tabel
doc.rect(50, tableTop, tableWidth, rowHeight)
  .fill(orangeColor);

doc.fontSize(11).font('Helvetica-Bold').fillColor('white');
doc.text('No', xPositions[0], tableTop + 10, { width: columnWidths[0], align: 'center' });
doc.text('Tanggal', xPositions[1], tableTop + 10, { width: columnWidths[1], align: 'center' });
doc.text('Kegiatan', xPositions[2], tableTop + 10, { width: columnWidths[2], align: 'center' });

doc.fillColor('black');
doc.font('Helvetica').fontSize(11);
let currentY = tableTop + rowHeight;
const tableBottomMargin = 80; // Margin bawah tabel

if (presensi && presensi.length > 0) {
  for (let i = 0; i < presensi.length; i++) {
    const p = presensi[i];
    
    // Dapatkan teks kegiatan
    const kegiatanHtml = p.kegiatan || p.laporan || '-';
    const kegiatanX = xPositions[2] + 8;
    const kegiatanWidth = columnWidths[2] - 16;
    const processedHtmlForContent = convertQuillHtmlToPlainText(kegiatanHtml);
    const baseLines = processedHtmlForContent.split('\n');
    const finalLines = baseLines;

    // Hitung tinggi konten teks
    let textHeight = 0;
    for (const rawLine of finalLines) {
      const line = rawLine.trimRight();
      if (line.trim()) {
        const isList = line.trim().startsWith('•') || /^\d+\.\s/.test(line.trim());
        const lineWidth = isList ? kegiatanWidth - 20 : kegiatanWidth;
        textHeight += doc.heightOfString(line.trim(), {
          width: lineWidth,
          align: 'justify',
          lineGap: 4
        }) + 4;
      } else {
        textHeight += 8; // Spasi untuk baris kosong
      }
    }
    
    // Hitung tinggi semua foto presensi dan pastikan muat di kolom
    const fotoBoxPadding = 10;
    const fotoBoxWidth = kegiatanWidth;
    const fotoBoxHeight = 180;
    const fotoList = getFotoCandidates(p.foto);
    const fotoHeight = fotoList.length
      ? (fotoList.length * fotoBoxHeight) + (Math.max(0, fotoList.length - 1) * fotoBoxPadding) + fotoBoxPadding
      : 0;
    
    // Tinggi baris final (minimal rowHeight, ditambah padding)
    const rowContentHeight = Math.max(rowHeight, textHeight + 20 + fotoHeight);

    // CEK APAKAH PERLU HALAMAN BARU
    if (currentY + rowContentHeight > doc.page.height - tableBottomMargin) {
      doc.addPage();
      currentY = 50;

      // Header tabel di halaman baru
      doc.rect(50, currentY, tableWidth, rowHeight).fill(orangeColor);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('white');
      doc.text('No', xPositions[0], currentY + 10, { width: columnWidths[0], align: 'center' });
      doc.text('Tanggal', xPositions[1], currentY + 10, { width: columnWidths[1], align: 'center' });
      doc.text('Kegiatan', xPositions[2], currentY + 10, { width: columnWidths[2], align: 'center' });
      doc.fillColor('black').font('Helvetica').fontSize(11);
      currentY += rowHeight;
    }

    const rowStartY = currentY;
    
    // Gambar border - VERTIKAL
    doc.lineWidth(0.5).strokeColor('#CCCCCC');
    doc.moveTo(xPositions[0], rowStartY).lineTo(xPositions[0], rowStartY + rowContentHeight).stroke();
    doc.moveTo(xPositions[1], rowStartY).lineTo(xPositions[1], rowStartY + rowContentHeight).stroke();
    doc.moveTo(xPositions[2], rowStartY).lineTo(xPositions[2], rowStartY + rowContentHeight).stroke();
    doc.moveTo(xPositions[0] + tableWidth, rowStartY).lineTo(xPositions[0] + tableWidth, rowStartY + rowContentHeight).stroke();
    
    // Gambar border - HORIZONTAL
    doc.moveTo(xPositions[0], rowStartY).lineTo(xPositions[0] + tableWidth, rowStartY).stroke();
    doc.moveTo(xPositions[0], rowStartY + rowContentHeight).lineTo(xPositions[0] + tableWidth, rowStartY + rowContentHeight).stroke();
    
    // Isi kolom No
   doc.fillColor('black')
         .fontSize(11)
         .font('Helvetica')
         .text((i + 1).toString(), xPositions[0], rowStartY + 10, { 
           width: columnWidths[0], 
           align: 'center' 
         });
      
      // Isi kolom Tanggal
      doc.text(p.tanggal_presensi || '-', xPositions[1], rowStartY + 10, { 
        width: columnWidths[1], 
        align: 'center' 
      });
    
    // Isi kolom Kegiatan
    let textY = rowStartY + 12;
    
    for (const line of finalLines) {
      if (line.trim()) {
        const isList = line.trim().startsWith('•') || /^\d+\.\s/.test(line.trim());
        
        doc.fontSize(11)
           .font('Helvetica')
           .text(line.trim(), isList ? kegiatanX + 15 : kegiatanX, textY, {
             width: isList ? kegiatanWidth - 15 : kegiatanWidth,
             align: 'justify',
             lineGap: 4
           });
        
        textY = doc.y + 2;
      } else {
        textY += 8;
      }
    }
    
    // Tambahkan foto jika ada
    if (fotoList.length) {
      try {
        let fotoY = textY + 2;

        for (let fotoIndex = 0; fotoIndex < fotoList.length; fotoIndex += 1) {
          const fotoRef = fotoList[fotoIndex];
          const imageSource = await resolvePresensiImageSource(fotoRef);

          if (!imageSource) {
            continue;
          }

          doc.fontSize(9)
            .font('Helvetica-Bold')
            .fillColor(grayColor)
           ;

          const imageY = fotoY + 8;
          doc.image(imageSource, kegiatanX, imageY, {
            width: fotoBoxWidth,
            height: fotoBoxHeight,
            fit: [fotoBoxWidth, fotoBoxHeight]
          });

          fotoY = imageY + fotoBoxHeight + fotoBoxPadding;
        }

        doc.fillColor('black').font('Helvetica').fontSize(11);
        textY = fotoY;
      } catch (error) {
        console.error('Error loading photo:', error.message);
      }
    }
    
    currentY += rowContentHeight;
  }
  
  // Gambar border bawah untuk baris terakhir (jika ada)
  doc.moveTo(xPositions[0], currentY).lineTo(xPositions[0] + tableWidth, currentY).stroke();
  
} else {
  const rowStartY = currentY;
  
  // Gambar border
  doc.lineWidth(0.5).strokeColor('#CCCCCC');
  doc.moveTo(xPositions[0], rowStartY).lineTo(xPositions[0] + tableWidth, rowStartY).stroke();
  doc.moveTo(xPositions[0], rowStartY + rowHeight).lineTo(xPositions[0] + tableWidth, rowStartY + rowHeight).stroke();
  doc.moveTo(xPositions[1], rowStartY).lineTo(xPositions[1], rowStartY + rowHeight).stroke();
  doc.moveTo(xPositions[2], rowStartY).lineTo(xPositions[2], rowStartY + rowHeight).stroke();
  
  doc.fontSize(11)
     .text('Tidak ada data presensi', xPositions[0] + 10, rowStartY + 10, {
       width: tableWidth - 20,
       align: 'center'
     });
  
  currentY += rowHeight;
}

doc.y = currentY + 20;

  // 6. KESIMPULAN DAN SARAN
  if (kesimpulan) {
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
      doc.y = 50;
    }
    
    const kesimpulanY = doc.y;
    
    doc.rect(50, kesimpulanY, doc.page.width - 100, 25)
      .fill(orangeColor);
    
    doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
      .text('IV. KESIMPULAN DAN SARAN', 55, kesimpulanY + 5);
    
    doc.fillColor('black');
    doc.moveDown(1);
    
    // Gunakan formatRichText untuk kesimpulan
    const newY = formatRichText(doc, kesimpulan, 55, doc.y, doc.page.width - 110);
    doc.y = newY;
  }

  // 7. BUKTI NOTA / PENGELUARAN PERJALANAN DINAS
  if (Array.isArray(bukti_pembayaran) && bukti_pembayaran.length > 0) {
    if (doc.y > doc.page.height - 220) {
      doc.addPage();
      doc.y = 50;
    }

    const buktiY = doc.y;

    doc.rect(50, buktiY, doc.page.width - 100, 25)
      .fill(orangeColor);

    doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
      .text('V. BUKTI NOTA / PENGELUARAN PERJALANAN DINAS', 55, buktiY + 5);

    doc.moveDown(0.5);

    for (let i = 0; i < bukti_pembayaran.length; i++) {
      const item = bukti_pembayaran[i] || {};
      const itemUrl = item.url || item.file || item.path || '';
      const itemName = item.name || item.filename || `Bukti ${i + 1}`;
      const itemMime = item.mimetype || '';

      if (doc.y > doc.page.height - 220) {
        doc.addPage();
        doc.y = 50;
      }

      doc.fontSize(11).font('Helvetica-Bold').fillColor('black')
        .text(`${i + 1}. ${itemName}`, 55, doc.y, {
          width: doc.page.width - 110,
          align: 'left'
        });
      doc.moveDown(0.3);

      try {
        if (isImageLike(itemUrl, itemMime)) {
          let imageSource = null;

          if (isHttpUrl(itemUrl)) {
            imageSource = await downloadUrlToBuffer(itemUrl);
          } else if (itemUrl) {
            const localCandidates = [
              path.join(process.cwd(), 'uploads/bukti-nota-pembayaran', itemUrl),
              path.join(__dirname, '../../uploads/bukti-nota-pembayaran', itemUrl),
              itemUrl
            ];
            imageSource = localCandidates.find((candidate) => fs.existsSync(candidate)) || null;
          }

          if (imageSource) {
            // Ukuran seragam per orientasi:
            // landscape = 260x170, portrait = 170x240
            let targetWidth = 260;
            let targetHeight = 170;
            try {
              const imageMeta = doc.openImage(imageSource);
              const isLandscape = imageMeta && imageMeta.width >= imageMeta.height;
              if (!isLandscape) {
                targetWidth = 170;
                targetHeight = 240;
              }
            } catch (metaErr) {
              // fallback ke ukuran landscape
            }

            if (doc.y + targetHeight + 20 > doc.page.height - 60) {
              doc.addPage();
              doc.y = 50;
            }

            const imageY = doc.y + 5;
            doc.image(imageSource, 65, imageY, {
              width: targetWidth,
              height: targetHeight,
              align: 'left',
              valign: 'top'
            });
            doc.y = imageY + targetHeight + 10;
          } else {
            doc.fontSize(10).font('Helvetica').fillColor(grayColor)
              .text('File gambar tidak dapat dimuat di PDF, namun data bukti telah tersimpan.', 65, doc.y + 5);
            doc.moveDown(1.5);
          }
        } else {
          doc.fontSize(10).font('Helvetica').fillColor(grayColor)
            .text('Lampiran non-gambar tercatat. Silakan cek file asli pada sistem.', 65, doc.y + 5);
          doc.moveDown(1.5);
        }
      } catch (err) {
        doc.fontSize(10).font('Helvetica').fillColor(grayColor)
          .text(`Lampiran tidak bisa ditampilkan (${err.message})`, 65, doc.y + 5);
        doc.moveDown(1.5);
      }

      doc.moveDown(0.5);
    }
  }
doc.moveDown(2);
  // 8. TANDA TANGAN
  const estimateSignatureSpace = () => {
    let spaceNeeded = 120;
    if (ttd_pegawai) {
      spaceNeeded += 60;
    } else {
      spaceNeeded += 20;
    }
    return spaceNeeded;
  };

  const signatureSpaceNeeded = estimateSignatureSpace();
  const currentYPosition = doc.y;
  const pageBottom = doc.page.height - 50;

  if (currentYPosition + signatureSpaceNeeded > pageBottom) {
    doc.addPage();
    doc.y = 50;
  }

  if (doc.y < 100) doc.y = 100;

  const lineLength = 200;
  const rightX = 350;

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('Yang melaksanakan perjalanan dinas,', rightX, doc.y);

  doc.moveDown(2);

  let ttdAdded = false;

  if (ttd_pegawai) {
    const possiblePaths = [
      path.join(__dirname, '../../uploads/ttd', ttd_pegawai),
      path.join(__dirname, '../../../uploads/ttd', ttd_pegawai),
      path.join(process.cwd(), 'uploads/ttd', ttd_pegawai),
    ].filter(Boolean);

    if (isHttpUrl(ttd_pegawai)) {
      try {
        const ttdBuffer = await downloadUrlToBuffer(ttd_pegawai);
        doc.image(ttdBuffer, rightX, doc.y, {
          width: 150,
          height: 60,
          fit: [150, 60]
        });
        ttdAdded = true;
        doc.y += 90;
      } catch (urlError) {
        console.error('Gagal memuat TTD dari URL:', urlError.message);
      }
    } else {
      for (const ttdPath of possiblePaths) {
        if (fs.existsSync(ttdPath)) {
          try {
            doc.image(ttdPath, rightX, doc.y, {
              width: 150,
              height: 60,
              fit: [150, 60]
            });
            ttdAdded = true;
            doc.y += 90;
            break;
          } catch (imageError) {
            console.error(`Gagal memuat gambar dari ${ttdPath}:`, imageError.message);
          }
        }
      }
    }
  }
  
  if (!ttdAdded) {
    const garisY = doc.y + 10;
    doc.lineWidth(1).strokeColor('black')
      .moveTo(rightX, garisY)
      .lineTo(rightX + lineLength, garisY)
      .stroke();
    doc.y += 20;
  }

  if (doc.y + 40 > doc.page.height - 50) {
    doc.addPage();
    doc.y = 50;
  }

  doc.font('Helvetica-Bold')
     .text(pegawai.nama || 'Tidak Ada Nama', rightX, doc.y);
  doc.font('Helvetica')
     .text(`NIP. ${pegawai.nip || ''}`, rightX, doc.y + 15);

  doc.y += 40;

  // 9. FOOTER
  if (doc.y > doc.page.height - 70) {
    doc.addPage();
    doc.y = 50;
  }

  doc.lineWidth(2)
     .strokeColor(orangeColor)
     .moveTo(50, doc.page.height - 50)
     .lineTo(doc.page.width - 50, doc.page.height - 50)
     .stroke();
  
  return new Promise((resolve, reject) => {
    doc.end();
    writeStream.on('finish', () => {
      console.log(`PDF berhasil dibuat: ${fileName}`);
      resolve(fileName);
    });
    writeStream.on('error', (err) => {
      console.error('Error creating PDF:', err);
      reject(err);
    });
  });
};
