BEGIN;

INSERT INTO surat_tugas_tujuan (
  surat_tugas_id,
  daerah_id,
  urutan,
  daerah_tujuan,
  latitude,
  longitude,
  radius,
  tanggal_mulai,
  tanggal_selesai,
  created_at,
  updated_at
)
SELECT
  surat.id,
  surat.daerah_id,
  1,
  surat.daerah_tujuan,
  surat.latitude,
  surat.longitude,
  surat.radius,
  surat.tanggal_mulai,
  surat.tanggal_selesai,
  COALESCE(surat.created_at, NOW()),
  COALESCE(surat.updated_at, NOW())
FROM surat_tugas AS surat
WHERE NOT EXISTS (
  SELECT 1
  FROM surat_tugas_tujuan AS tujuan
  WHERE tujuan.surat_tugas_id = surat.id
)
ON CONFLICT (surat_tugas_id, urutan) DO NOTHING;

COMMIT;
