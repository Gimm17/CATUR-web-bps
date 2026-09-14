const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const databaseUrl = process.env.CATUR_TEST_DATABASE_URL;

test('backfill menghubungkan presensi lama ke tujuan yang mencakup tanggalnya', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async () => {
  const client = new Client({ connectionString: databaseUrl });
  const schema = `legacy_tujuan_${process.pid}_${Date.now()}`;
  const createMigration = fs.readFileSync(
    path.resolve(__dirname, '../../migrations/20260909-create-surat-tugas-tujuan.sql'),
    'utf8'
  );
  const backfillMigration = fs.readFileSync(
    path.resolve(__dirname, '../../migrations/20260909-backfill-surat-tugas-tujuan.sql'),
    'utf8'
  );
  await client.connect();

  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    await client.query(`
      CREATE TABLE daerah (id INTEGER PRIMARY KEY);
      CREATE TABLE surat_tugas (
        id INTEGER PRIMARY KEY,
        daerah_id INTEGER NOT NULL REFERENCES daerah(id),
        daerah_tujuan VARCHAR(255) NOT NULL,
        latitude NUMERIC(10,6) NOT NULL,
        longitude NUMERIC(10,6) NOT NULL,
        radius INTEGER NOT NULL,
        tanggal_mulai DATE NOT NULL,
        tanggal_selesai DATE NOT NULL,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      );
      CREATE TABLE presensi (
        id INTEGER PRIMARY KEY,
        surat_tugas_id INTEGER NOT NULL,
        tanggal_presensi DATE NOT NULL
      );
      INSERT INTO daerah (id) VALUES (7);
      INSERT INTO surat_tugas (
        id, daerah_id, daerah_tujuan, latitude, longitude, radius,
        tanggal_mulai, tanggal_selesai, created_at, updated_at
      ) VALUES (
        10, 7, 'Buol', -0.900000, 119.870000, 100,
        '2026-09-14', '2026-09-16', NOW(), NOW()
      );
      INSERT INTO presensi (id, surat_tugas_id, tanggal_presensi)
      VALUES (20, 10, '2026-09-15');
    `);

    await client.query(createMigration);
    await client.query(backfillMigration);

    const result = await client.query(`
      SELECT presensi.surat_tugas_tujuan_id IS NOT NULL AS linked,
             tujuan.surat_tugas_id,
             tujuan.urutan
      FROM presensi
      JOIN surat_tugas_tujuan AS tujuan
        ON tujuan.id = presensi.surat_tugas_tujuan_id
      WHERE presensi.id = 20
    `);

    assert.deepEqual(result.rows, [{
      linked: true,
      surat_tugas_id: 10,
      urutan: 1,
    }]);
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => {});
    await client.end();
  }
});

test('menegakkan urutan unik untuk setiap surat tugas', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    const suffix = `${process.pid}-${Date.now()}`;
    const userResult = await client.query(
      `INSERT INTO users (nama, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Schema Test', `schema-${suffix}@catur.test`, 'not-used', 'pegawai']
    );
    const daerahResult = await client.query(
      `INSERT INTO daerah (nama_daerah, titik_lokasi, latitude, longitude, radius)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [`Daerah ${suffix}`, 'Titik test', -0.900000, 119.870000, 100]
    );

    const userId = userResult.rows[0].id;
    const daerahId = daerahResult.rows[0].id;
    const suratResult = await client.query(
      `INSERT INTO surat_tugas (
         user_id, nomor_surat, daerah_id, daerah_tujuan, latitude, longitude,
         radius, tanggal_mulai, tanggal_selesai, nama_kegiatan,
         pembebanan_biaya, tujuan_kegiatan, status, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'AKTIF', NOW(), NOW()
       ) RETURNING id`,
      [
        userId,
        `ST-${suffix}`,
        daerahId,
        'Daerah test',
        -0.900000,
        119.870000,
        100,
        '2026-09-09',
        '2026-09-10',
        'Kegiatan test',
        `Biaya-${suffix}`,
        `Tujuan-${suffix}`,
      ]
    );
    const suratTugasId = suratResult.rows[0].id;

    const insertTujuan = (urutan) => client.query(
      `INSERT INTO surat_tugas_tujuan (
         surat_tugas_id, daerah_id, urutan, daerah_tujuan, latitude,
         longitude, radius, tanggal_mulai, tanggal_selesai, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        suratTugasId,
        daerahId,
        urutan,
        'Daerah test',
        -0.900000,
        119.870000,
        100,
        '2026-09-09',
        '2026-09-10',
      ]
    );

    await insertTujuan(1);
    await client.query('SAVEPOINT duplicate_order');
    await assert.rejects(insertTujuan(1), (error) => {
      assert.equal(error.code, '23505');
      assert.equal(error.constraint, 'uq_surat_tugas_tujuan_order');
      return true;
    });
    await client.query('ROLLBACK TO SAVEPOINT duplicate_order');

    await insertTujuan(2);
    const countResult = await client.query(
      'SELECT COUNT(*)::integer AS count FROM surat_tugas_tujuan WHERE surat_tugas_id = $1',
      [suratTugasId]
    );
    assert.equal(countResult.rows[0].count, 2);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
});
