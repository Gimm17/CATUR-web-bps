const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const databaseUrl = process.env.CATUR_TEST_DATABASE_URL;
let sequelize;
let User;
let Daerah;
let SuratTugas;
let SuratTugasTujuan;
let resolveActiveAssignment;
let app;
let getBusinessDate;
let addBusinessDays;

if (databaseUrl) {
  const parsedDatabaseUrl = new URL(databaseUrl);
  process.env.DB_HOST = parsedDatabaseUrl.hostname;
  process.env.DB_PORT = parsedDatabaseUrl.port || '5432';
  process.env.DB_NAME = parsedDatabaseUrl.pathname.slice(1);
  process.env.DB_USER = decodeURIComponent(parsedDatabaseUrl.username);
  process.env.DB_PASSWORD = decodeURIComponent(parsedDatabaseUrl.password);
  process.env.JWT_SECRET = 'catur-active-integration-secret';

  sequelize = require('../../src/config/database');
  app = require('../../src/app');
  User = require('../../src/models/user.model');
  Daerah = require('../../src/models/daerah.model');
  SuratTugas = require('../../src/models/suratTugas.model');
  SuratTugasTujuan = require('../../src/models/suratTugasTujuan.model');
  ({ resolveActiveAssignment } = require('../../src/services/activeAssignment.service'));
  ({ getBusinessDate, addBusinessDays } = require('../../src/utils/businessDate'));
}

test('resolver melaporkan konflik dua surat aktif pada tanggal yang sama', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const pegawai = await User.create({
    nama: 'Pegawai Conflict Integration',
    email: `pegawai-conflict-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerah = await Daerah.create({
    nama_daerah: `Daerah Conflict ${suffix}`,
    titik_lokasi: 'Titik conflict',
    latitude: -0.990000,
    longitude: 119.960000,
    radius: 100,
  });
  const activeDate = getBusinessDate();

  const suratRows = [];
  for (const index of [1, 2]) {
    const surat = await SuratTugas.create({
      user_id: pegawai.id,
      nomor_surat: `ST-CONFLICT-${index}-${suffix}`,
      daerah_id: daerah.id,
      daerah_tujuan: daerah.nama_daerah,
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: daerah.radius,
      tanggal_mulai: activeDate,
      tanggal_selesai: addBusinessDays(activeDate, 1),
      nama_kegiatan: `Kegiatan conflict ${index}`,
      pembebanan_biaya: `Biaya-conflict-${index}-${suffix}`,
      tujuan_kegiatan: `Tujuan-conflict-${index}-${suffix}`,
      status: index === 1 ? 'AKTIF' : 'aktif',
    });
    suratRows.push(surat);
    await SuratTugasTujuan.create({
      surat_tugas_id: surat.id,
      daerah_id: daerah.id,
      urutan: 1,
      daerah_tujuan: daerah.nama_daerah,
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: daerah.radius,
      tanggal_mulai: activeDate,
      tanggal_selesai: addBusinessDays(activeDate, 1),
    });
  }

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await SuratTugas.destroy({ where: { id: suratRows.map((item) => item.id) } });
    await Daerah.destroy({ where: { id: daerah.id } });
    await User.destroy({ where: { id: pegawai.id } });
  });

  await assert.rejects(
    () => resolveActiveAssignment(pegawai.id, activeDate),
    (error) => {
      assert.equal(error.code, 'ACTIVE_ASSIGNMENT_CONFLICT');
      assert.deepEqual(
        error.assignmentIds,
        suratRows.map((item) => item.id).sort((left, right) => left - right)
      );
      return true;
    }
  );

  const token = jwt.sign(
    { id: pegawai.id, role: pegawai.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/surat-tugas/aktif`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  const payload = await response.json();
  assert.equal(response.status, 409, JSON.stringify(payload));
  assert.equal(payload.code, 'ACTIVE_ASSIGNMENT_CONFLICT');
  assert.deepEqual(
    payload.assignment_ids,
    suratRows.map((item) => item.id).sort((left, right) => left - right)
  );
});

test('endpoint aktif mengembalikan seluruh tujuan dan tujuan aktif berdasarkan WITA', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const activeDate = getBusinessDate();
  const pegawai = await User.create({
    nama: 'Pegawai Active Integration',
    email: `pegawai-active-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerah = await Daerah.create({
    nama_daerah: `Daerah Active ${suffix}`,
    titik_lokasi: 'Titik active',
    latitude: -1.000000,
    longitude: 119.970000,
    radius: 100,
  });
  const surat = await SuratTugas.create({
    user_id: pegawai.id,
    nomor_surat: `ST-ACTIVE-${suffix}`,
    daerah_id: daerah.id,
    daerah_tujuan: daerah.nama_daerah,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    radius: daerah.radius,
    tanggal_mulai: addBusinessDays(activeDate, -2),
    tanggal_selesai: addBusinessDays(activeDate, 1),
    nama_kegiatan: 'Kegiatan active integration',
    pembebanan_biaya: `Biaya-active-${suffix}`,
    tujuan_kegiatan: `Tujuan-active-${suffix}`,
    status: 'AKTIF',
  });
  const tujuanRows = [];
  for (const [urutan, mulai, selesai] of [
    [1, addBusinessDays(activeDate, -2), addBusinessDays(activeDate, -1)],
    [2, activeDate, addBusinessDays(activeDate, 1)],
  ]) {
    tujuanRows.push(await SuratTugasTujuan.create({
      surat_tugas_id: surat.id,
      daerah_id: daerah.id,
      urutan,
      daerah_tujuan: daerah.nama_daerah,
      latitude: daerah.latitude,
      longitude: daerah.longitude,
      radius: daerah.radius,
      tanggal_mulai: mulai,
      tanggal_selesai: selesai,
    }));
  }

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await SuratTugas.destroy({ where: { id: surat.id } });
    await Daerah.destroy({ where: { id: daerah.id } });
    await User.destroy({ where: { id: pegawai.id } });
  });

  const token = jwt.sign(
    { id: pegawai.id, role: pegawai.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/surat-tugas/aktif`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  const payload = await response.json();

  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.tujuan.length, 2);
  assert.equal(payload.tujuan_aktif.id, tujuanRows[1].id);
  assert.equal(payload.tanggal_server, activeDate);
  assert.equal(payload.timezone, 'Asia/Makassar');
});

test('endpoint aktif mengembalikan 404 saat pegawai tidak punya tugas hari ini', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const token = jwt.sign(
    { id: 2147483647, role: 'pegawai' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/surat-tugas/aktif`,
    { headers: { authorization: `Bearer ${token}` } }
  );

  assert.equal(response.status, 404);
});

if (databaseUrl) {
  test.after(async () => {
    await sequelize.close();
  });
}
