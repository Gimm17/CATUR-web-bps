\echo '=== CATUR POST-DEPLOY DATABASE CHECK ==='

SELECT
  to_regclass(current_schema() || '.surat_tugas_tujuan') IS NOT NULL
    AS tujuan_table_ok,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'presensi'
      AND column_name = 'surat_tugas_tujuan_id'
  ) AS presensi_tujuan_column_ok,
  EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = current_schema()
      AND pg_type.typname = 'enum_laporan_perjalanan_status'
      AND pg_enum.enumlabel = 'draft'
  ) AS draft_status_ok,
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND tablename = 'laporan_perjalanan'
      AND indexname = 'uq_laporan_perjalanan_surat_pegawai'
  ) AS laporan_unique_index_ok;

SELECT
  (SELECT COUNT(*) FROM surat_tugas) AS total_surat_tugas,
  (SELECT COUNT(*) FROM surat_tugas_tujuan) AS total_tujuan,
  (SELECT COUNT(*) FROM presensi) AS total_presensi,
  (SELECT COUNT(*) FROM presensi WHERE surat_tugas_tujuan_id IS NULL)
    AS presensi_tujuan_belum_terpetakan;

\echo 'surat_tugas_tanpa_tujuan: hasil harus kosong'
SELECT surat.id, surat.nomor_surat
FROM surat_tugas AS surat
LEFT JOIN surat_tugas_tujuan AS tujuan
  ON tujuan.surat_tugas_id = surat.id
WHERE tujuan.id IS NULL
ORDER BY surat.id;

\echo 'duplicate_laporan: hasil harus kosong'
SELECT surat_tugas_id, pegawai_id, COUNT(*) AS jumlah
FROM laporan_perjalanan
GROUP BY surat_tugas_id, pegawai_id
HAVING COUNT(*) > 1
ORDER BY surat_tugas_id, pegawai_id;

