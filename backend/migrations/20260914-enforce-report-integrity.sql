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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_type.typname = 'enum_laporan_perjalanan_status'
      AND pg_namespace.nspname = current_schema()
  ) THEN
    CREATE TYPE enum_laporan_perjalanan_status AS ENUM (
      'draft',
      'dikirim',
      'dicek_keuangan',
      'disetujui_keuangan',
      'ditandatangani',
      'pencairan_dana',
      'dana_turun'
    );
  END IF;
END $$;

ALTER TYPE enum_laporan_perjalanan_status
  ADD VALUE IF NOT EXISTS 'draft';

DO $$
DECLARE
  status_type TEXT;
  invalid_status TEXT;
BEGIN
  SELECT columns.udt_name
  INTO status_type
  FROM information_schema.columns
  WHERE columns.table_schema = current_schema()
    AND columns.table_name = 'laporan_perjalanan'
    AND columns.column_name = 'status';

  IF status_type IS NULL THEN
    RAISE EXCEPTION 'Kolom laporan_perjalanan.status tidak ditemukan';
  END IF;

  IF status_type <> 'enum_laporan_perjalanan_status' THEN
    SELECT laporan.status
    INTO invalid_status
    FROM laporan_perjalanan AS laporan
    WHERE laporan.status IS NOT NULL
      AND laporan.status NOT IN (
        'draft',
        'dikirim',
        'dicek_keuangan',
        'disetujui_keuangan',
        'ditandatangani',
        'pencairan_dana',
        'dana_turun'
      )
    LIMIT 1;

    IF invalid_status IS NOT NULL THEN
      RAISE EXCEPTION
        'Status laporan_perjalanan tidak dikenal: %', invalid_status;
    END IF;

    ALTER TABLE laporan_perjalanan
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE laporan_perjalanan
      ALTER COLUMN status TYPE enum_laporan_perjalanan_status
      USING status::TEXT::enum_laporan_perjalanan_status;

    ALTER TABLE laporan_perjalanan
      ALTER COLUMN status SET DEFAULT 'dikirim'::enum_laporan_perjalanan_status;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_laporan_perjalanan_surat_pegawai
  ON laporan_perjalanan (surat_tugas_id, pegawai_id);
