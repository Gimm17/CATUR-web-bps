const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const databaseUrl = process.env.CATUR_TEST_DATABASE_URL;

test('migration mengubah status VARCHAR dari dump lama menjadi enum tanpa kehilangan data', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async () => {
  const client = new Client({ connectionString: databaseUrl });
  const schema = `legacy_report_${process.pid}_${Date.now()}`;
  const migration = fs.readFileSync(
    path.resolve(__dirname, '../../migrations/20260914-enforce-report-integrity.sql'),
    'utf8'
  );
  await client.connect();

  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    await client.query(`
      CREATE TABLE laporan_perjalanan (
        id BIGSERIAL PRIMARY KEY,
        surat_tugas_id INTEGER NOT NULL,
        pegawai_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'dikirim'
      )
    `);
    await client.query(`
      INSERT INTO laporan_perjalanan (surat_tugas_id, pegawai_id, status)
      VALUES (10, 20, 'draft'), (11, 20, 'dana_turun')
    `);

    await client.query(migration);

    const column = await client.query(
      `SELECT data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = 'laporan_perjalanan'
         AND column_name = 'status'`,
      [schema]
    );
    const rows = await client.query(
      'SELECT surat_tugas_id, pegawai_id, status::text FROM laporan_perjalanan ORDER BY id'
    );

    assert.deepEqual(column.rows[0], {
      data_type: 'USER-DEFINED',
      udt_name: 'enum_laporan_perjalanan_status',
    });
    assert.deepEqual(rows.rows, [
      { surat_tugas_id: 10, pegawai_id: 20, status: 'draft' },
      { surat_tugas_id: 11, pegawai_id: 20, status: 'dana_turun' },
    ]);
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => {});
    await client.end();
  }
});

test('enum laporan menerima status draft', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const result = await client.query(
      `SELECT enumlabel
       FROM pg_enum
       JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
       WHERE pg_type.typname = 'enum_laporan_perjalanan_status'
       ORDER BY pg_enum.enumsortorder`
    );

    assert.equal(result.rows.some((row) => row.enumlabel === 'draft'), true);
  } finally {
    await client.end();
  }
});

test('satu pegawai hanya dapat memiliki satu laporan per surat tugas', {
  skip: databaseUrl ? false : 'CATUR_TEST_DATABASE_URL belum dikonfigurasi',
}, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    const suffix = `${process.pid}-${Date.now()}`;
    const userResult = await client.query(
      `INSERT INTO users (nama, email, password, role)
       VALUES ($1, $2, $3, 'pegawai')
       RETURNING id`,
      ['Report Schema Test', `report-schema-${suffix}@catur.test`, 'not-used']
    );
    const daerahResult = await client.query(
      `INSERT INTO daerah (nama_daerah, titik_lokasi, latitude, longitude, radius)
       VALUES ($1, 'Titik test', -0.900000, 119.870000, 100)
       RETURNING id`,
      [`Daerah Report ${suffix}`]
    );
    const suratResult = await client.query(
      `INSERT INTO surat_tugas (
         user_id, nomor_surat, daerah_id, daerah_tujuan, latitude, longitude,
         radius, tanggal_mulai, tanggal_selesai, nama_kegiatan,
         pembebanan_biaya, tujuan_kegiatan, status, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, -0.900000, 119.870000,
         100, '2026-09-14', '2026-09-16', 'Kegiatan schema',
         'Biaya schema', 'Tujuan schema', 'AKTIF', NOW(), NOW()
       ) RETURNING id`,
      [
        userResult.rows[0].id,
        `ST-REPORT-SCHEMA-${suffix}`,
        daerahResult.rows[0].id,
        `Daerah Report ${suffix}`,
      ]
    );

    const reportValues = [suratResult.rows[0].id, userResult.rows[0].id];
    const insertReport = () => client.query(
      `INSERT INTO laporan_perjalanan (
         surat_tugas_id, pegawai_id, status, created_at, updated_at
       ) VALUES ($1, $2, 'dikirim', NOW(), NOW())`,
      reportValues
    );

    await insertReport();
    await client.query('SAVEPOINT duplicate_report');
    await assert.rejects(insertReport, (error) => {
      assert.equal(error.code, '23505');
      assert.equal(error.constraint, 'uq_laporan_perjalanan_surat_pegawai');
      return true;
    });
    await client.query('ROLLBACK TO SAVEPOINT duplicate_report');
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
});
