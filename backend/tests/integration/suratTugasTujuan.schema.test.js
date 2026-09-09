const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const databaseUrl = process.env.CATUR_TEST_DATABASE_URL;

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
         longitude, radius, tanggal_mulai, tanggal_selesai
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
