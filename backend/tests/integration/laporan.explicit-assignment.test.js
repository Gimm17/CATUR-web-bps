const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const databaseUrl = process.env.CATUR_TEST_DATABASE_URL;
let sequelize;
let app;
let User;
let Daerah;
let SuratTugas;
let SuratTugasTujuan;
let LaporanPerjalanan;

if (databaseUrl) {
  const parsedDatabaseUrl = new URL(databaseUrl);
  process.env.DB_HOST = parsedDatabaseUrl.hostname;
  process.env.DB_PORT = parsedDatabaseUrl.port || '5432';
  process.env.DB_NAME = parsedDatabaseUrl.pathname.slice(1);
  process.env.DB_USER = decodeURIComponent(parsedDatabaseUrl.username);
  process.env.DB_PASSWORD = decodeURIComponent(parsedDatabaseUrl.password);
  process.env.JWT_SECRET = 'catur-report-integration-secret';

  sequelize = require('../../src/config/database');
  app = require('../../src/app');
  User = require('../../src/models/user.model');
  Daerah = require('../../src/models/daerah.model');
  SuratTugas = require('../../src/models/suratTugas.model');
  SuratTugasTujuan = require('../../src/models/suratTugasTujuan.model');
  LaporanPerjalanan = require('../../src/models/laporan.perjalanan');
}

async function startServer(t) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function createFixture(t) {
  const suffix = `${process.pid}-${Date.now()}`;
  const pegawai = await User.create({
    nama: 'Pegawai Laporan Eksplisit',
    email: `pegawai-laporan-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerah = await Daerah.create({
    nama_daerah: `Daerah Laporan ${suffix}`,
    titik_lokasi: 'Titik laporan eksplisit',
    latitude: -0.900000,
    longitude: 119.850000,
    radius: 100,
  });
  const suratRows = [];
  const tujuanRows = [];

  for (const [label, mulai, selesai] of [
    ['A', '2026-07-01', '2026-07-02'],
    ['B', '2026-07-10', '2026-07-11'],
  ]) {
    const surat = await SuratTugas.create({
      user_id: pegawai.id,
      nomor_surat: `ST-REPORT-${label}-${suffix}`,
      daerah_id: daerah.id,
      daerah_tujuan: `${daerah.nama_daerah} ${label}`,
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: daerah.radius,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
      nama_kegiatan: `Kegiatan laporan ${label}`,
      pembebanan_biaya: `Biaya-report-${label}-${suffix}`,
      tujuan_kegiatan: `Tujuan-report-${label}-${suffix}`,
      status: 'AKTIF',
    });
    suratRows.push(surat);
    tujuanRows.push(await SuratTugasTujuan.create({
      surat_tugas_id: surat.id,
      daerah_id: daerah.id,
      urutan: 1,
      daerah_tujuan: `${daerah.nama_daerah} ${label}`,
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: daerah.radius,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
    }));
    await LaporanPerjalanan.create({
      surat_tugas_id: surat.id,
      pegawai_id: pegawai.id,
      kesimpulan: `Kesimpulan ${label}`,
      status: 'dikirim',
    });
  }

  t.after(async () => {
    await LaporanPerjalanan.destroy({
      where: { surat_tugas_id: suratRows.map((row) => row.id) },
    });
    await SuratTugasTujuan.destroy({
      where: { surat_tugas_id: suratRows.map((row) => row.id) },
    });
    await SuratTugas.destroy({ where: { id: suratRows.map((row) => row.id) } });
    await Daerah.destroy({ where: { id: daerah.id } });
    await User.destroy({ where: { id: pegawai.id } });
  });

  const token = jwt.sign(
    { id: pegawai.id, role: pegawai.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  return { pegawai, suratRows, tujuanRows, token };
}

test('GET eksplisit memuat progres surat A dan B tanpa tertukar', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const baseUrl = await startServer(t);
  const fixture = await createFixture(t);
  const request = (suratId) => fetch(
    `${baseUrl}/api/perjalanan/surat/${suratId}`,
    { headers: { authorization: `Bearer ${fixture.token}` } }
  );

  const responseA = await request(fixture.suratRows[0].id);
  const responseB = await request(fixture.suratRows[1].id);
  const payloadA = await responseA.json();
  const payloadB = await responseB.json();

  assert.equal(responseA.status, 200, JSON.stringify(payloadA));
  assert.equal(responseB.status, 200, JSON.stringify(payloadB));
  assert.equal(payloadA.surat_tugas.id, fixture.suratRows[0].id);
  assert.equal(payloadB.surat_tugas.id, fixture.suratRows[1].id);
  assert.equal(payloadA.laporan_akhir.kesimpulan, 'Kesimpulan A');
  assert.equal(payloadB.laporan_akhir.kesimpulan, 'Kesimpulan B');
  assert.equal(payloadA.tujuan[0].id, fixture.tujuanRows[0].id);
  assert.equal(payloadB.tujuan[0].id, fixture.tujuanRows[1].id);
  assert.equal(payloadA.report_window.timezone, 'Asia/Makassar');
});

test('endpoint legacy tidak memilih surat terakhir saat tidak ada assignment aktif hari ini', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const baseUrl = await startServer(t);
  const fixture = await createFixture(t);

  const response = await fetch(`${baseUrl}/api/perjalanan`, {
    headers: { authorization: `Bearer ${fixture.token}` },
  });
  const payload = await response.json();

  assert.equal(response.status, 404, JSON.stringify(payload));
  assert.equal(payload.code, 'NO_ACTIVE_ASSIGNMENT');
});

if (databaseUrl) {
  test.after(async () => {
    await sequelize.close();
  });
}
