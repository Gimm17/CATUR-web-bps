const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  parseFotoMeta,
  parseFotoList,
  isPresensiFotoLengkap,
  serializeFotoMeta,
} = require('../../src/utils/presensiFoto');
const generateLaporanWord = require('../../src/utils/wordGenerator');
const generateLaporanPDF = require('../../src/utils/pdfGenerator');

test('presensi tetap wajib 2 foto secara default bila belum di-unlock admin', () => {
  const satuFoto = JSON.stringify(['foto-1.jpg']);
  const duaFoto = JSON.stringify(['foto-1.jpg', 'foto-2.jpg']);

  assert.equal(isPresensiFotoLengkap(null), false);
  assert.equal(isPresensiFotoLengkap(satuFoto), false);
  assert.equal(isPresensiFotoLengkap(duaFoto), true);
  assert.deepEqual(parseFotoList(satuFoto), ['foto-1.jpg']);
});

test('admin force unlock mengizinkan presensi 1 foto tanpa menambah foto palsu', () => {
  const forcedPayload = serializeFotoMeta({
    photos: ['foto-1.jpg'],
    force_foto_by_admin: true,
    force_foto_reason: 'Server mati saat upload foto kedua',
    force_foto_admin_id: 1,
    force_foto_admin_nama: 'Admin Utama',
  });

  const meta = parseFotoMeta(forcedPayload);
  assert.deepEqual(meta.photos, ['foto-1.jpg']);
  assert.equal(meta.force_foto_by_admin, true);
  assert.equal(meta.force_foto_admin_nama, 'Admin Utama');
  assert.equal(isPresensiFotoLengkap(forcedPayload), true);
  assert.deepEqual(parseFotoList(forcedPayload), ['foto-1.jpg']);
});

test('pembatalan force unlock mengembalikan format array standar dan status belum lengkap untuk 1 foto', () => {
  const unforcedPayload = serializeFotoMeta({
    photos: ['foto-1.jpg'],
    force_foto_by_admin: false,
  });

  assert.equal(unforcedPayload, '["foto-1.jpg"]');
  assert.equal(isPresensiFotoLengkap(unforcedPayload), false);
});

test('generateLaporanWord dan generateLaporanPDF menghasilkan file dengan list terstruktur, tanpa penomoran ganda, dan mendukung presensi 1 foto hasil unlock admin', async (t) => {
  const forcedFoto = serializeFotoMeta({
    photos: ['foto-1.jpg'],
    force_foto_by_admin: true,
  });

  const sampleData = {
    pegawai: {
      nama: 'Pegawai Uji',
      nip: '199001012020121001',
      role: 'Staf',
      unit_kerja: 'BPS Provinsi Sulawesi Tengah',
    },
    surat: {
      nomor_surat: 'B-100/72000/VS.300/2026',
      nama_kegiatan: 'Supervisi Lapangan',
      tujuan_kegiatan: 'Koordinasi Pendataan',
      daerah_tujuan: 'Kabupaten Donggala',
      pembebanan_biaya: 'DIPA BPS 2026',
      tanggal_mulai: '2026-09-10',
      tanggal_selesai: '2026-09-11',
    },
    presensi: [
      {
        tanggal_presensi: '2026-09-10',
        foto: forcedFoto,
        laporan: '<ol><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span>1. Koordinasi awal di kantor</li><li data-list="ordered"><span class="ql-ui" contenteditable="false"></span>2. Pemeriksaan dokumen</li></ol>',
      },
      {
        tanggal_presensi: '2026-09-11',
        foto: JSON.stringify(['foto-a.jpg', 'foto-b.jpg']),
        laporan: '<ol><li data-list="ordered">Evaluasi lapangan</li><li data-list="ordered">Penyusunan ringkasan</li></ol>',
      },
    ],
    kesimpulan: '<ol><li data-list="ordered">1. Kegiatan berjalan lancar</li><li data-list="ordered">2. Tindak lanjut diperlukan</li></ol>',
    ttd_pegawai: null,
    bukti_pembayaran: [],
  };

  const wordFileName = await generateLaporanWord(sampleData);
  const pdfFileName = await generateLaporanPDF(sampleData);

  const wordPath = path.join(__dirname, '../../uploads/word', wordFileName);
  const pdfPath = path.join(__dirname, '../../uploads/pdf', pdfFileName);

  t.after(() => {
    if (fs.existsSync(wordPath)) fs.unlinkSync(wordPath);
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  assert.equal(fs.existsSync(wordPath), true);
  assert.equal(fs.existsSync(pdfPath), true);
  assert.ok(fs.statSync(wordPath).size > 1000);
  assert.ok(fs.statSync(pdfPath).size > 1000);
});

