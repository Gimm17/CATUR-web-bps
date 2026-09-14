const sequelize = require('../config/database');

async function ensureColumn(tableName, columnSql) {
  // Postgres supports "ADD COLUMN IF NOT EXISTS" (idempotent).
  await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnSql};`);
}

async function assertReportIntegritySchema() {
  const [enumRows] = await sequelize.query(
    `SELECT enumlabel
     FROM pg_enum
     JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
     WHERE pg_type.typname = 'enum_laporan_perjalanan_status'`
  );
  const hasDraft = enumRows.some((row) => row.enumlabel === 'draft');

  const [indexRows] = await sequelize.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename = 'laporan_perjalanan'
       AND indexname = 'uq_laporan_perjalanan_surat_pegawai'`
  );

  if (!hasDraft || indexRows.length === 0) {
    const error = new Error(
      'Schema laporan belum siap. Jalankan migration 20260914-enforce-report-integrity.sql.'
    );
    error.code = 'SCHEMA_MIGRATION_REQUIRED';
    throw error;
  }
}

module.exports = async function ensureSchema() {
  try {
    await ensureColumn('laporan_perjalanan', 'file_word VARCHAR(1024)');
    await ensureColumn('daerah', 'geojson JSONB');
    await assertReportIntegritySchema();
  } catch (err) {
    // Jangan crash diam-diam: lebih baik kelihatan jelas di log.
    console.error('ensureSchema failed:', err.message);
    throw err;
  }
};
