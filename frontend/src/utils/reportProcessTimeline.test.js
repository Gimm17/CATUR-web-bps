import { describe, expect, it } from 'vitest';

import {
  buildReportProcessTimeline,
  mergeAssignmentReportContext,
} from './reportProcessTimeline';

describe('mergeAssignmentReportContext', () => {
  it('menggabungkan detail progres ke surat yang dipilih', () => {
    const result = mergeAssignmentReportContext(
      { id: 225, nomor_surat: 'ST-225', laporan: null },
      {
        laporan_akhir: { id: 90, status: 'dikirim' },
        presensi: [{ id: 1 }, { id: 2 }, { id: 3 }],
        bukti_pembayaran: [{ name: 'nota.jpg' }],
        pembayaran: { status: 'menunggu' },
        report_window: { editable: true },
      },
    );

    expect(result).toMatchObject({
      id: 225,
      nomor_surat: 'ST-225',
      laporan: { id: 90, status: 'dikirim' },
      presensi_count: 3,
      pembayaran: { status: 'menunggu' },
      report_window: { editable: true },
    });
    expect(result.bukti_pembayaran).toHaveLength(1);
  });
});

describe('buildReportProcessTimeline', () => {
  it('membentuk sembilan tahap yang sama dengan alur Laporan & Statistik', () => {
    const timeline = buildReportProcessTimeline({
      statusInfo: { durasiHari: 3 },
      presensi: [
        { tanggal_presensi: '2026-09-10', foto_list: ['a.jpg', 'b.jpg'] },
        { tanggal_presensi: '2026-09-11', foto_list: ['c.jpg', 'd.jpg'] },
        { tanggal_presensi: '2026-09-12', foto_list: ['e.jpg', 'f.jpg'] },
      ],
      bukti_pembayaran: [],
      laporan: {
        status: 'dikirim',
        ttd_pegawai: 'ttd.png',
        tanggal_ttd_pegawai: '2026-09-13T00:01:00Z',
        tanggal_kirim: '2026-09-13T00:41:00Z',
      },
    });

    expect(timeline.map((stage) => stage.label)).toEqual([
      'Presensi Harian',
      'Tambahkan Tanda Tangan',
      'Upload Bukti Nota Dinas',
      'Kirim Laporan Akhir',
      'Pengecekan Keuangan',
      'Disetujui Keuangan',
      'TTD & Persetujuan Atasan',
      'Pengajuan Pencairan Dana',
      'Dana Diturunkan',
    ]);
    expect(timeline.map((stage) => stage.state)).toEqual([
      'completed',
      'completed',
      'optional',
      'completed',
      'current',
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
  });

  it('menandai semua tahap akhir selesai ketika dana sudah diturunkan', () => {
    const timeline = buildReportProcessTimeline({
      statusInfo: { durasiHari: 1 },
      presensi_count: 1,
      bukti_pembayaran: [{ name: 'nota.jpg' }],
      pembayaran: { tanggal_transfer: '2026-09-15T01:00:00Z' },
      laporan: {
        status: 'dana_turun',
        ttd_pegawai: 'pegawai.png',
        tanggal_kirim: '2026-09-12T00:00:00Z',
        tanggal_verifikasi_keuangan: '2026-09-13T00:00:00Z',
        tanggal_ttd: '2026-09-14T00:00:00Z',
      },
    });

    expect(timeline.filter((stage) => stage.optional || stage.state === 'completed'))
      .toHaveLength(9);
    expect(timeline.at(-1)).toMatchObject({
      label: 'Dana Diturunkan',
      state: 'completed',
      date: '2026-09-15T01:00:00Z',
    });
  });
});
