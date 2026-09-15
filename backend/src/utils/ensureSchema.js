const REQUIRED_SCHEMA_FLAGS = Object.freeze({
  has_file_word: 'laporan_perjalanan.file_word',
  has_geojson: 'daerah.geojson',
  has_tujuan_table: 'surat_tugas_tujuan',
  has_presensi_tujuan: 'presensi.surat_tugas_tujuan_id',
  has_draft_status: 'enum_laporan_perjalanan_status[draft]',
  has_report_unique_index: 'uq_laporan_perjalanan_surat_pegawai',
});

async function verify(database) {
  const [rows] = await database.query(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'laporan_perjalanan'
          AND column_name = 'file_word'
      ) AS has_file_word,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'daerah'
          AND column_name = 'geojson'
      ) AS has_geojson,
      to_regclass(current_schema() || '.surat_tugas_tujuan') IS NOT NULL
        AS has_tujuan_table,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'presensi'
          AND column_name = 'surat_tugas_tujuan_id'
      ) AS has_presensi_tujuan,
      EXISTS (
        SELECT 1
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE pg_namespace.nspname = current_schema()
          AND pg_type.typname = 'enum_laporan_perjalanan_status'
          AND pg_enum.enumlabel = 'draft'
      ) AS has_draft_status,
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'laporan_perjalanan'
          AND indexname = 'uq_laporan_perjalanan_surat_pegawai'
      ) AS has_report_unique_index
  `);

  const result = rows[0] || {};
  const missing = Object.entries(REQUIRED_SCHEMA_FLAGS)
    .filter(([flag]) => result[flag] !== true)
    .map(([, label]) => label);

  if (missing.length > 0) {
    const error = new Error(
      `Schema belum siap: ${missing.join(', ')}. Jalankan migration backend/migrations secara berurutan.`
    );
    error.code = 'SCHEMA_MIGRATION_REQUIRED';
    error.missing = missing;
    throw error;
  }

  return result;
}

async function ensureSchema() {
  // Database diload saat startup, bukan ketika utility di-import oleh test/tooling.
  const database = require('../config/database');
  return verify(database);
}

ensureSchema.verify = verify;
ensureSchema.REQUIRED_SCHEMA_FLAGS = REQUIRED_SCHEMA_FLAGS;

module.exports = ensureSchema;
