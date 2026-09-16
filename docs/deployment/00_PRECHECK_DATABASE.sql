\echo '=== CATUR PRE-DEPLOY DATABASE CHECK ==='

SELECT current_database() AS database_name, version() AS postgresql_version;

SELECT
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM surat_tugas) AS total_surat_tugas,
  (SELECT COUNT(*) FROM presensi) AS total_presensi,
  (SELECT COUNT(*) FROM laporan_perjalanan) AS total_laporan_perjalanan;

\echo 'duplicate_laporan: hasil harus kosong'
SELECT surat_tugas_id, pegawai_id, COUNT(*) AS jumlah
FROM laporan_perjalanan
GROUP BY surat_tugas_id, pegawai_id
HAVING COUNT(*) > 1
ORDER BY surat_tugas_id, pegawai_id;

SELECT
  to_regclass(current_schema() || '.surat_tugas_tujuan') IS NOT NULL
    AS tujuan_table_already_exists,
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'presensi'
      AND column_name = 'surat_tugas_tujuan_id'
  ) AS presensi_tujuan_column_already_exists;

