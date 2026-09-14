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
let Presensi;
let LaporanPerjalanan;
let getBusinessDate;
let addBusinessDays;

if (databaseUrl) {
  const parsedDatabaseUrl = new URL(databaseUrl);
  process.env.DB_HOST = parsedDatabaseUrl.hostname;
  process.env.DB_PORT = parsedDatabaseUrl.port || '5432';
  process.env.DB_NAME = parsedDatabaseUrl.pathname.slice(1);
  process.env.DB_USER = decodeURIComponent(parsedDatabaseUrl.username);
  process.env.DB_PASSWORD = decodeURIComponent(parsedDatabaseUrl.password);
  process.env.JWT_SECRET = 'catur-edit-window-integration-secret';

  sequelize = require('../../src/config/database');
  app = require('../../src/app');
  User = require('../../src/models/user.model');
  Daerah = require('../../src/models/daerah.model');
  SuratTugas = require('../../src/models/suratTugas.model');
  SuratTugasTujuan = require('../../src/models/suratTugasTujuan.model');
  Presensi = require('../../src/models/presensi.model');
  LaporanPerjalanan = require('../../src/models/laporan.perjalanan');
  ({ getBusinessDate, addBusinessDays } = require('../../src/utils/businessDate'));
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

async function createFixture(t, { tripEndDate, reportStatus = null }) {
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const pegawai = await User.create({
    nama: 'Pegawai Edit Window',
    email: `edit-window-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerah = await Daerah.create({
    nama_daerah: `Daerah Edit Window ${suffix}`,
    titik_lokasi: 'Titik edit window',
    latitude: -0.910000,
    longitude: 119.860000,
    radius: 100,
  });
  const surat = await SuratTugas.create({
    user_id: pegawai.id,
    nomor_surat: `ST-EDIT-${suffix}`,
    daerah_id: daerah.id,
    daerah_tujuan: daerah.nama_daerah,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    radius: daerah.radius,
    tanggal_mulai: tripEndDate,
    tanggal_selesai: tripEndDate,
    nama_kegiatan: 'Kegiatan edit window',
    pembebanan_biaya: `Biaya-edit-${suffix}`,
    tujuan_kegiatan: `Tujuan-edit-${suffix}`,
    status: 'SELESAI',
  });
  const tujuan = await SuratTugasTujuan.create({
    surat_tugas_id: surat.id,
    daerah_id: daerah.id,
    urutan: 1,
    daerah_tujuan: daerah.nama_daerah,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    radius: daerah.radius,
    tanggal_mulai: tripEndDate,
    tanggal_selesai: tripEndDate,
  });
  const presensi = await Presensi.create({
    user_id: pegawai.id,
    surat_tugas_id: surat.id,
    surat_tugas_tujuan_id: tujuan.id,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    foto: JSON.stringify(['foto-1.jpg', 'foto-2.jpg']),
    laporan: null,
    tanggal_presensi: tripEndDate,
    jam_presensi: '08:00:00',
  });
  if (reportStatus) {
    await LaporanPerjalanan.create({
      surat_tugas_id: surat.id,
      pegawai_id: pegawai.id,
      status: reportStatus,
      kesimpulan: 'Laporan untuk status lock',
    });
  }

  t.after(async () => {
    await LaporanPerjalanan.destroy({ where: { surat_tugas_id: surat.id } });
    await Presensi.destroy({ where: { id: presensi.id } });
    await SuratTugasTujuan.destroy({ where: { id: tujuan.id } });
    await SuratTugas.destroy({ where: { id: surat.id } });
    await Daerah.destroy({ where: { id: daerah.id } });
    await User.destroy({ where: { id: pegawai.id } });
  });

  return {
    presensi,
    surat,
    token: jwt.sign(
      { id: pegawai.id, role: pegawai.role },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    ),
  };
}

async function updateDailyReport(baseUrl, fixture, laporan, legacy = false) {
  return fetch(
    legacy
      ? `${baseUrl}/api/presensi/laporan`
      : `${baseUrl}/api/presensi/${fixture.presensi.id}/laporan`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${fixture.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ laporan, presensi_id: fixture.presensi.id }),
    }
  );
}

test('laporan harian dapat diedit tepat pada hari terakhir deadline WITA', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const baseUrl = await startServer(t);
  const fixture = await createFixture(t, {
    tripEndDate: addBusinessDays(getBusinessDate(), -7),
  });

  const response = await updateDailyReport(baseUrl, fixture, 'Hasil kegiatan hari terakhir');
  const payload = await response.json();

  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.match(payload.data.laporan, /hasil kegiatan/i);
});

test('laporan harian ditolak satu hari setelah deadline WITA', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const baseUrl = await startServer(t);
  const fixture = await createFixture(t, {
    tripEndDate: addBusinessDays(getBusinessDate(), -8),
  });

  const response = await updateDailyReport(baseUrl, fixture, 'Tidak boleh tersimpan');
  const payload = await response.json();

  assert.equal(response.status, 409, JSON.stringify(payload));
  assert.equal(payload.code, 'REPORT_DEADLINE_PASSED');
  assert.equal(payload.report_window.editable, false);
});

test('status proses keuangan mengunci laporan harian sebelum deadline', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const baseUrl = await startServer(t);
  const fixture = await createFixture(t, {
    tripEndDate: getBusinessDate(),
    reportStatus: 'dicek_keuangan',
  });

  const response = await updateDailyReport(baseUrl, fixture, 'Tidak boleh tersimpan');
  const payload = await response.json();

  assert.equal(response.status, 409, JSON.stringify(payload));
  assert.equal(payload.code, 'REPORT_LOCKED_BY_STATUS');
  assert.equal(payload.report_window.lock_reason, 'finance_processing');
});

test('adapter legacy memakai handler yang sama dan menandai deprecation', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const baseUrl = await startServer(t);
  const fixture = await createFixture(t, {
    tripEndDate: addBusinessDays(getBusinessDate(), -7),
  });

  const response = await updateDailyReport(baseUrl, fixture, 'Laporan melalui adapter', true);
  const payload = await response.json();

  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(response.headers.get('deprecation'), 'true');
});

test('kirim laporan akhir yang terkunci mengembalikan report window', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const baseUrl = await startServer(t);
  const fixture = await createFixture(t, {
    tripEndDate: addBusinessDays(getBusinessDate(), -8),
  });

  const response = await fetch(
    `${baseUrl}/api/perjalanan/surat/${fixture.surat.id}/kirim`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${fixture.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ kesimpulan: 'Tidak boleh dikirim' }),
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 409, JSON.stringify(payload));
  assert.equal(payload.code, 'REPORT_DEADLINE_PASSED');
  assert.equal(payload.report_window.editable, false);
});

if (databaseUrl) {
  test.after(async () => {
    await sequelize.close();
  });
}
