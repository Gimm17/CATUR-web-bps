DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM laporan_perjalanan
    GROUP BY surat_tugas_id, pegawai_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate laporan_perjalanan harus diselesaikan sebelum migration';
  END IF;
END $$;

ALTER TYPE enum_laporan_perjalanan_status
  ADD VALUE IF NOT EXISTS 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS uq_laporan_perjalanan_surat_pegawai
  ON laporan_perjalanan (surat_tugas_id, pegawai_id);

