BEGIN;

CREATE TABLE IF NOT EXISTS surat_tugas_tujuan (
  id BIGSERIAL PRIMARY KEY,
  surat_tugas_id INTEGER NOT NULL REFERENCES surat_tugas(id) ON DELETE CASCADE,
  daerah_id INTEGER NOT NULL REFERENCES daerah(id) ON DELETE RESTRICT,
  urutan INTEGER NOT NULL CHECK (urutan > 0),
  daerah_tujuan VARCHAR(255) NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  radius INTEGER NOT NULL CHECK (radius >= 0),
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_surat_tugas_tujuan_dates
    CHECK (tanggal_mulai <= tanggal_selesai),
  CONSTRAINT uq_surat_tugas_tujuan_order
    UNIQUE (surat_tugas_id, urutan)
);

CREATE INDEX IF NOT EXISTS ix_surat_tugas_tujuan_active
  ON surat_tugas_tujuan (surat_tugas_id, tanggal_mulai, tanggal_selesai);

ALTER TABLE presensi
  ADD COLUMN IF NOT EXISTS surat_tugas_tujuan_id BIGINT
  REFERENCES surat_tugas_tujuan(id) ON DELETE RESTRICT;

COMMIT;
