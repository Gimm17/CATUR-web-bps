const test = require('node:test');
const assert = require('node:assert/strict');

const ensureSchema = require('../../src/utils/ensureSchema');

test('schema check hanya membaca metadata dan tidak menjalankan DDL saat startup', async () => {
  const statements = [];
  const database = {
    async query(sql) {
      statements.push(sql);
      return [[{
        has_file_word: true,
        has_geojson: true,
        has_tujuan_table: true,
        has_presensi_tujuan: true,
        has_draft_status: true,
        has_report_unique_index: true,
      }]];
    },
  };

  await ensureSchema.verify(database);

  assert.equal(statements.length, 1);
  assert.doesNotMatch(statements[0], /\b(?:ALTER|CREATE|DROP|TRUNCATE)\b/i);
});

test('schema check menyebutkan komponen migration yang belum tersedia', async () => {
  const database = {
    async query() {
      return [[{
        has_file_word: true,
        has_geojson: true,
        has_tujuan_table: false,
        has_presensi_tujuan: false,
        has_draft_status: true,
        has_report_unique_index: true,
      }]];
    },
  };

  await assert.rejects(
    ensureSchema.verify(database),
    (error) => {
      assert.equal(error.code, 'SCHEMA_MIGRATION_REQUIRED');
      assert.match(error.message, /surat_tugas_tujuan/);
      assert.match(error.message, /presensi\.surat_tugas_tujuan_id/);
      return true;
    }
  );
});
