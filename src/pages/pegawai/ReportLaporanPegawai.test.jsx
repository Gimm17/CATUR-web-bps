import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../layouts/PegawaiLayout', () => ({
  default: ({ children }) => <>{children}</>,
}));
vi.mock('../../services/suratTugas.service', () => ({
  getAllSuratTugas: vi.fn(),
}));
vi.mock('../../utils/auth', () => ({
  getUser: () => ({ id: 7, role: 'pegawai' }),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
}));

import api from '../../api/axios';
import { getAllSuratTugas } from '../../services/suratTugas.service';
import ReportLaporanPegawai from './ReportLaporanPegawai';

describe('ReportLaporanPegawai', () => {
  it('memberikan target ID berbeda untuk setiap surat pada riwayat', async () => {
    getAllSuratTugas.mockResolvedValueOnce({
      data: [
        {
          id: 11,
          nomor_surat: 'SURAT A',
          nama_kegiatan: 'Kegiatan A',
          daerah_tujuan: 'Palu',
          tanggal_mulai: '2026-09-01',
          tanggal_selesai: '2026-09-02',
          tujuan: [
            { id: 111, urutan: 1, daerah_tujuan: 'Buol', tanggal_mulai: '2026-09-01', tanggal_selesai: '2026-09-01' },
            { id: 112, urutan: 2, daerah_tujuan: 'Tolitoli', tanggal_mulai: '2026-09-02', tanggal_selesai: '2026-09-02' },
          ],
          tujuan_aktif: { id: 112 },
        },
        {
          id: 22,
          nomor_surat: 'SURAT B',
          nama_kegiatan: 'Kegiatan B',
          daerah_tujuan: 'Poso',
          tanggal_mulai: '2026-09-03',
          tanggal_selesai: '2026-09-04',
        },
      ],
    });
    api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{ id: 202, status: 'dikirim', tanggal_kirim: '2026-09-05T08:00:00Z' }],
      });

    render(
      <MemoryRouter>
        <ReportLaporanPegawai />
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: 'Lanjutkan SURAT A' }))
      .toHaveAttribute('href', '/laporan/11');
    expect(screen.getByRole('link', { name: 'Lihat Laporan SURAT B' }))
      .toHaveAttribute('href', '/laporan/22');
    expect(screen.getByText('1. Buol')).toBeVisible();
    expect(screen.getByText('2. Tolitoli')).toBeVisible();
    expect(screen.getByText('Aktif hari ini')).toBeVisible();
  });

  it('surat yang belum memiliki laporan tetap menyediakan aksi lanjutkan', async () => {
    getAllSuratTugas.mockResolvedValueOnce({
      data: [{
        id: 31,
        nomor_surat: 'SURAT TANPA LAPORAN',
        nama_kegiatan: 'Kegiatan belum selesai',
        daerah_tujuan: 'Sigi',
      }],
    });
    api.get.mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter>
        <ReportLaporanPegawai />
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: 'Lanjutkan SURAT TANPA LAPORAN' }))
      .toBeVisible();
  });
});
