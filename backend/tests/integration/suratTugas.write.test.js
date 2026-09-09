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

if (databaseUrl) {
  const parsedDatabaseUrl = new URL(databaseUrl);
  process.env.DB_HOST = parsedDatabaseUrl.hostname;
  process.env.DB_PORT = parsedDatabaseUrl.port || '5432';
  process.env.DB_NAME = parsedDatabaseUrl.pathname.slice(1);
  process.env.DB_USER = decodeURIComponent(parsedDatabaseUrl.username);
  process.env.DB_PASSWORD = decodeURIComponent(parsedDatabaseUrl.password);
  process.env.JWT_SECRET = 'catur-integration-test-secret';

  sequelize = require('../../src/config/database');
  app = require('../../src/app');
  User = require('../../src/models/user.model');
  Daerah = require('../../src/models/daerah.model');
  SuratTugas = require('../../src/models/suratTugas.model');
  SuratTugasTujuan = require('../../src/models/suratTugasTujuan.model');
  Presensi = require('../../src/models/presensi.model');
}

test('POST dua tujuan menyimpan header keseluruhan dan child berurutan', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const admin = await User.create({
    nama: 'Admin Integration',
    email: `admin-write-${suffix}@catur.test`,
    password: 'not-used',
    role: 'admin',
  });
  const pegawai = await User.create({
    nama: 'Pegawai Integration',
    email: `pegawai-write-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerahPertama = await Daerah.create({
    nama_daerah: `Daerah Pertama ${suffix}`,
    titik_lokasi: 'Titik pertama',
    latitude: -0.900000,
    longitude: 119.870000,
    radius: 100,
  });
  const daerahKedua = await Daerah.create({
    nama_daerah: `Daerah Kedua ${suffix}`,
    titik_lokasi: 'Titik kedua',
    latitude: -0.910000,
    longitude: 119.880000,
    radius: 150,
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await SuratTugas.destroy({ where: { nomor_surat: `ST-WRITE-${suffix}` } });
    await Daerah.destroy({ where: { id: [daerahPertama.id, daerahKedua.id] } });
    await User.destroy({ where: { id: [admin.id, pegawai.id] } });
  });

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/surat-tugas`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      nomor_surat: `ST-WRITE-${suffix}`,
      user_id: pegawai.id,
      nama_kegiatan: 'Kegiatan multi tujuan',
      pembebanan_biaya: `Biaya-${suffix}`,
      tujuan_kegiatan: `Tujuan-${suffix}`,
      tujuan: [
        {
          daerah_id: daerahKedua.id,
          tanggal_mulai: '2026-09-09',
          tanggal_selesai: '2026-09-10',
        },
        {
          daerah_id: daerahPertama.id,
          tanggal_mulai: '2026-09-07',
          tanggal_selesai: '2026-09-08',
        },
      ],
    }),
  });
  const payload = await response.json();

  assert.equal(response.status, 201, JSON.stringify(payload));
  assert.equal(payload.data.tanggal_mulai, '2026-09-07');
  assert.equal(payload.data.tanggal_selesai, '2026-09-10');
  assert.equal(payload.data.daerah_id, daerahPertama.id);

  const children = await SuratTugasTujuan.findAll({
    where: { surat_tugas_id: payload.data.id },
    order: [['urutan', 'ASC']],
  });
  assert.deepEqual(
    children.map((child) => [child.daerah_id, child.urutan]),
    [[daerahPertama.id, 1], [daerahKedua.id, 2]]
  );

  const listResponse = await fetch(`http://127.0.0.1:${address.port}/api/surat-tugas`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const listPayload = await listResponse.json();
  const listedSurat = listPayload.find((item) => item.id === payload.data.id);

  assert.equal(listResponse.status, 200, JSON.stringify(listPayload));
  assert.deepEqual(
    listedSurat.tujuan.map((item) => [item.daerah_id, item.urutan]),
    [[daerahPertama.id, 1], [daerahKedua.id, 2]]
  );
  assert.equal(listedSurat.tujuan[0].daerah.nama_daerah, daerahPertama.nama_daerah);
});

test('pegawai tidak dapat membuat surat tugas', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const pegawai = await User.create({
    nama: 'Pegawai Tanpa Akses Tulis',
    email: `pegawai-forbidden-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerah = await Daerah.create({
    nama_daerah: `Daerah Forbidden ${suffix}`,
    titik_lokasi: 'Titik forbidden',
    latitude: -0.920000,
    longitude: 119.890000,
    radius: 100,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await SuratTugas.destroy({ where: { nomor_surat: `ST-FORBIDDEN-${suffix}` } });
    await Daerah.destroy({ where: { id: daerah.id } });
    await User.destroy({ where: { id: pegawai.id } });
  });

  const token = jwt.sign(
    { id: pegawai.id, role: pegawai.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/surat-tugas`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      nomor_surat: `ST-FORBIDDEN-${suffix}`,
      user_id: pegawai.id,
      daerah_id: daerah.id,
      tanggal_mulai: '2026-09-09',
      tanggal_selesai: '2026-09-09',
      nama_kegiatan: 'Tidak boleh dibuat pegawai',
      pembebanan_biaya: `Biaya-forbidden-${suffix}`,
      tujuan_kegiatan: `Tujuan-forbidden-${suffix}`,
    }),
  });

  assert.equal(response.status, 403);
  assert.equal(
    await SuratTugas.count({ where: { nomor_surat: `ST-FORBIDDEN-${suffix}` } }),
    0
  );
});

test('PUT mengganti seluruh tujuan dan header secara atomic', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const admin = await User.create({
    nama: 'Admin Update Integration',
    email: `admin-update-${suffix}@catur.test`,
    password: 'not-used',
    role: 'admin',
  });
  const pegawai = await User.create({
    nama: 'Pegawai Update Integration',
    email: `pegawai-update-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerahRows = await Promise.all([
    ['Lama', -0.930000, 119.900000],
    ['Baru Pertama', -0.940000, 119.910000],
    ['Baru Kedua', -0.950000, 119.920000],
  ].map(([label, latitude, longitude]) => Daerah.create({
    nama_daerah: `${label} ${suffix}`,
    titik_lokasi: `Titik ${label}`,
    latitude,
    longitude,
    radius: 100,
  })));
  const [daerahLama, daerahPertama, daerahKedua] = daerahRows;
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await SuratTugas.destroy({ where: { nomor_surat: `ST-UPDATE-${suffix}` } });
    await Daerah.destroy({ where: { id: daerahRows.map((item) => item.id) } });
    await User.destroy({ where: { id: [admin.id, pegawai.id] } });
  });

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/surat-tugas`;
  const commonHeaders = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  const createResponse = await fetch(baseUrl, {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify({
      nomor_surat: `ST-UPDATE-${suffix}`,
      user_id: pegawai.id,
      daerah_id: daerahLama.id,
      tanggal_mulai: '2026-09-07',
      tanggal_selesai: '2026-09-10',
      nama_kegiatan: 'Kegiatan sebelum update',
      pembebanan_biaya: `Biaya-update-${suffix}`,
      tujuan_kegiatan: `Tujuan-update-${suffix}`,
    }),
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201, JSON.stringify(created));

  const updateResponse = await fetch(`${baseUrl}/${created.data.id}`, {
    method: 'PUT',
    headers: commonHeaders,
    body: JSON.stringify({
      nomor_surat: `ST-UPDATE-${suffix}`,
      user_id: pegawai.id,
      daerah_id: daerahPertama.id,
      tanggal_mulai: '2026-09-07',
      tanggal_selesai: '2026-09-10',
      nama_kegiatan: 'Kegiatan setelah update',
      pembebanan_biaya: `Biaya-update-${suffix}`,
      tujuan_kegiatan: `Tujuan-update-${suffix}`,
      tujuan: [
        {
          daerah_id: daerahKedua.id,
          tanggal_mulai: '2026-09-09',
          tanggal_selesai: '2026-09-10',
        },
        {
          daerah_id: daerahPertama.id,
          tanggal_mulai: '2026-09-07',
          tanggal_selesai: '2026-09-08',
        },
      ],
    }),
  });
  const updatedPayload = await updateResponse.json();

  assert.equal(updateResponse.status, 200, JSON.stringify(updatedPayload));
  assert.equal(updatedPayload.data.daerah_id, daerahPertama.id);
  assert.equal(updatedPayload.data.tanggal_mulai, '2026-09-07');
  assert.equal(updatedPayload.data.tanggal_selesai, '2026-09-10');
  const children = await SuratTugasTujuan.findAll({
    where: { surat_tugas_id: created.data.id },
    order: [['urutan', 'ASC']],
  });
  assert.deepEqual(
    children.map((child) => [child.daerah_id, child.urutan]),
    [[daerahPertama.id, 1], [daerahKedua.id, 2]]
  );
});

test('pegawai ditolak sebelum lookup pada PUT dan DELETE surat tugas', {
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
    { id: 999999999, role: 'pegawai' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();

  for (const method of ['PUT', 'DELETE']) {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/surat-tugas/999999999`,
      {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        ...(method === 'PUT' ? { body: JSON.stringify({}) } : {}),
      }
    );
    assert.equal(response.status, 403, `${method} harus ditolak sebelum lookup`);
  }
});

test('PUT menolak jadwal yang membuat tanggal presensi tidak terpetakan', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const admin = await User.create({
    nama: 'Admin Presence Integration',
    email: `admin-presence-${suffix}@catur.test`,
    password: 'not-used',
    role: 'admin',
  });
  const pegawai = await User.create({
    nama: 'Pegawai Presence Integration',
    email: `pegawai-presence-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerah = await Daerah.create({
    nama_daerah: `Daerah Presence ${suffix}`,
    titik_lokasi: 'Titik presence',
    latitude: -0.960000,
    longitude: 119.930000,
    radius: 100,
  });
  const surat = await SuratTugas.create({
    user_id: pegawai.id,
    nomor_surat: `ST-PRESENCE-${suffix}`,
    daerah_id: daerah.id,
    daerah_tujuan: daerah.nama_daerah,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    radius: daerah.radius,
    tanggal_mulai: '2026-09-07',
    tanggal_selesai: '2026-09-10',
    nama_kegiatan: 'Kegiatan dengan presensi',
    pembebanan_biaya: `Biaya-presence-${suffix}`,
    tujuan_kegiatan: `Tujuan-presence-${suffix}`,
    status: 'AKTIF',
  });
  const tujuan = await SuratTugasTujuan.create({
    surat_tugas_id: surat.id,
    daerah_id: daerah.id,
    urutan: 1,
    daerah_tujuan: daerah.nama_daerah,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    radius: daerah.radius,
    tanggal_mulai: '2026-09-07',
    tanggal_selesai: '2026-09-10',
  });
  await Presensi.create({
    user_id: pegawai.id,
    surat_tugas_id: surat.id,
    surat_tugas_tujuan_id: tujuan.id,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    tanggal_presensi: '2026-09-10',
    jam_presensi: '08:00:00',
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await Presensi.destroy({ where: { surat_tugas_id: surat.id } });
    await SuratTugas.destroy({ where: { id: surat.id } });
    await Daerah.destroy({ where: { id: daerah.id } });
    await User.destroy({ where: { id: [admin.id, pegawai.id] } });
  });

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/surat-tugas/${surat.id}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        nomor_surat: surat.nomor_surat,
        user_id: pegawai.id,
        nama_kegiatan: surat.nama_kegiatan,
        pembebanan_biaya: surat.pembebanan_biaya,
        tujuan_kegiatan: surat.tujuan_kegiatan,
        tujuan: [{
          daerah_id: daerah.id,
          tanggal_mulai: '2026-09-07',
          tanggal_selesai: '2026-09-09',
        }],
      }),
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 409, JSON.stringify(payload));
  assert.equal(payload.code, 'SCHEDULE_HAS_PRESENCE');
  await surat.reload();
  assert.equal(surat.tanggal_selesai, '2026-09-10');
  assert.equal(
    await SuratTugasTujuan.count({ where: { surat_tugas_id: surat.id } }),
    1
  );
});

test('PUT memetakan ulang presensi ke child baru yang mencakup tanggalnya', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const admin = await User.create({
    nama: 'Admin Remap Integration',
    email: `admin-remap-${suffix}@catur.test`,
    password: 'not-used',
    role: 'admin',
  });
  const pegawai = await User.create({
    nama: 'Pegawai Remap Integration',
    email: `pegawai-remap-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerah = await Daerah.create({
    nama_daerah: `Daerah Remap ${suffix}`,
    titik_lokasi: 'Titik remap',
    latitude: -0.970000,
    longitude: 119.940000,
    radius: 100,
  });
  const surat = await SuratTugas.create({
    user_id: pegawai.id,
    nomor_surat: `ST-REMAP-${suffix}`,
    daerah_id: daerah.id,
    daerah_tujuan: daerah.nama_daerah,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    radius: daerah.radius,
    tanggal_mulai: '2026-09-07',
    tanggal_selesai: '2026-09-10',
    nama_kegiatan: 'Kegiatan remap presensi',
    pembebanan_biaya: `Biaya-remap-${suffix}`,
    tujuan_kegiatan: `Tujuan-remap-${suffix}`,
    status: 'AKTIF',
  });
  const oldTujuan = await SuratTugasTujuan.create({
    surat_tugas_id: surat.id,
    daerah_id: daerah.id,
    urutan: 1,
    daerah_tujuan: daerah.nama_daerah,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    radius: daerah.radius,
    tanggal_mulai: '2026-09-07',
    tanggal_selesai: '2026-09-10',
  });
  const presensi = await Presensi.create({
    user_id: pegawai.id,
    surat_tugas_id: surat.id,
    surat_tugas_tujuan_id: oldTujuan.id,
    latitude: daerah.latitude,
    longitude: daerah.longitude,
    tanggal_presensi: '2026-09-10',
    jam_presensi: '08:00:00',
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await Presensi.destroy({ where: { surat_tugas_id: surat.id } });
    await SuratTugas.destroy({ where: { id: surat.id } });
    await Daerah.destroy({ where: { id: daerah.id } });
    await User.destroy({ where: { id: [admin.id, pegawai.id] } });
  });

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const response = await fetch(
    `http://127.0.0.1:${address.port}/api/surat-tugas/${surat.id}`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        nomor_surat: surat.nomor_surat,
        user_id: pegawai.id,
        nama_kegiatan: surat.nama_kegiatan,
        pembebanan_biaya: surat.pembebanan_biaya,
        tujuan_kegiatan: surat.tujuan_kegiatan,
        tujuan: [
          {
            daerah_id: daerah.id,
            tanggal_mulai: '2026-09-07',
            tanggal_selesai: '2026-09-08',
          },
          {
            daerah_id: daerah.id,
            tanggal_mulai: '2026-09-09',
            tanggal_selesai: '2026-09-10',
          },
        ],
      }),
    }
  );
  const payload = await response.json();

  assert.equal(response.status, 200, JSON.stringify(payload));
  await presensi.reload();
  assert.notEqual(Number(presensi.surat_tugas_tujuan_id), Number(oldTujuan.id));
  const remappedTujuan = await SuratTugasTujuan.findByPk(
    presensi.surat_tugas_tujuan_id
  );
  assert.equal(remappedTujuan.tanggal_mulai, '2026-09-09');
  assert.equal(remappedTujuan.tanggal_selesai, '2026-09-10');
});

test('POST menolak jadwal overlap dan daerah tanpa zona tanpa meninggalkan header', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async (t) => {
  const suffix = `${process.pid}-${Date.now()}`;
  const admin = await User.create({
    nama: 'Admin Invalid Integration',
    email: `admin-invalid-${suffix}@catur.test`,
    password: 'not-used',
    role: 'admin',
  });
  const pegawai = await User.create({
    nama: 'Pegawai Invalid Integration',
    email: `pegawai-invalid-${suffix}@catur.test`,
    password: 'not-used',
    role: 'pegawai',
  });
  const daerahValid = await Daerah.create({
    nama_daerah: `Daerah Valid ${suffix}`,
    titik_lokasi: 'Titik valid',
    latitude: -0.980000,
    longitude: 119.950000,
    radius: 100,
  });
  const daerahTanpaZona = await Daerah.create({
    nama_daerah: `Daerah Tanpa Zona ${suffix}`,
    titik_lokasi: 'Belum dipetakan',
    latitude: 0,
    longitude: 0,
    radius: 0,
    geojson: null,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await SuratTugas.destroy({
      where: { nomor_surat: [`ST-OVERLAP-${suffix}`, `ST-NOZONE-${suffix}`] },
    });
    await Daerah.destroy({ where: { id: [daerahValid.id, daerahTanpaZona.id] } });
    await User.destroy({ where: { id: [admin.id, pegawai.id] } });
  });

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/api/surat-tugas`;
  const headers = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  const commonBody = {
    user_id: pegawai.id,
    nama_kegiatan: 'Kegiatan invalid integration',
  };

  const overlapResponse = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...commonBody,
      nomor_surat: `ST-OVERLAP-${suffix}`,
      pembebanan_biaya: `Biaya-overlap-${suffix}`,
      tujuan_kegiatan: `Tujuan-overlap-${suffix}`,
      tujuan: JSON.stringify([
        {
          daerah_id: daerahValid.id,
          tanggal_mulai: '2026-09-07',
          tanggal_selesai: '2026-09-09',
        },
        {
          daerah_id: daerahValid.id,
          tanggal_mulai: '2026-09-09',
          tanggal_selesai: '2026-09-10',
        },
      ]),
    }),
  });
  const overlapPayload = await overlapResponse.json();
  assert.equal(overlapResponse.status, 422, JSON.stringify(overlapPayload));
  assert.equal(overlapPayload.code, 'TUJUAN_OVERLAP');

  const noZoneResponse = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...commonBody,
      nomor_surat: `ST-NOZONE-${suffix}`,
      pembebanan_biaya: `Biaya-nozone-${suffix}`,
      tujuan_kegiatan: `Tujuan-nozone-${suffix}`,
      tujuan: [{
        daerah_id: daerahTanpaZona.id,
        tanggal_mulai: '2026-09-07',
        tanggal_selesai: '2026-09-10',
      }],
    }),
  });
  const noZonePayload = await noZoneResponse.json();
  assert.equal(noZoneResponse.status, 400, JSON.stringify(noZonePayload));
  assert.equal(noZonePayload.code, 'DAERAH_ZONE_UNAVAILABLE');
  assert.equal(
    await SuratTugas.count({
      where: { nomor_surat: [`ST-OVERLAP-${suffix}`, `ST-NOZONE-${suffix}`] },
    }),
    0
  );
});

if (databaseUrl) {
  test.after(async () => {
    await sequelize.close();
  });
}
