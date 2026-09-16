import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../services/surat.service', () => ({
  getSuratTugasLaporanDefault: vi.fn(),
}));

vi.mock('../../services/akun.service', () => ({
  getProfil: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import {
  getSuratTugasLaporanDefault,
} from '../../services/surat.service';
import LaporanEntry from './LaporanEntry';
import LaporanBySurat from './LaporanBySurat';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderEntry() {
  return render(
    <MemoryRouter initialEntries={['/laporan']}>
      <Routes>
        <Route path="/laporan" element={<LaporanEntry />} />
        <Route path="/laporan/:suratId" element={<LocationProbe />} />
        <Route path="/laporan-report" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LaporanEntry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mengarahkan satu surat aktif ke halaman progres berdasarkan ID', async () => {
    getSuratTugasLaporanDefault.mockResolvedValueOnce({ id: 41, nomor_surat: 'ST-41' });

    renderEntry();

    expect(await screen.findByTestId('location')).toHaveTextContent('/laporan/41');
  });

  it('mengarahkan pegawai tanpa surat aktif ke laporan surat selesai terbaru', async () => {
    getSuratTugasLaporanDefault.mockResolvedValueOnce({
      id: 225,
      tanggal_selesai: '2026-09-12',
    });

    renderEntry();

    expect(await screen.findByTestId('location')).toHaveTextContent('/laporan/225');
  });

  it('tetap berada di halaman laporan jika belum ada surat yang dapat ditampilkan', async () => {
    getSuratTugasLaporanDefault.mockResolvedValueOnce(null);

    renderEntry();

    expect(await screen.findByText('Belum ada laporan perjalanan yang dapat ditampilkan.'))
      .toBeVisible();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('menampilkan error dan menyediakan percobaan ulang untuk kegagalan server', async () => {
    getSuratTugasLaporanDefault.mockRejectedValueOnce({ response: { status: 500 } });

    renderEntry();

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memeriksa surat tugas aktif');
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  });

  it('mempertahankan layout aplikasi selama surat laporan sedang ditentukan', () => {
    getSuratTugasLaporanDefault.mockReturnValueOnce(new Promise(() => {}));

    const { container } = renderEntry();

    expect(screen.getByRole('status')).toHaveTextContent('Menyiapkan laporan perjalanan');
    expect(container.querySelector('.content-wrapper')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Logo BPS' })).toBeVisible();
  });
});

it('route laporan-surat lama mengarahkan ID yang sama ke halaman progres tunggal', () => {
  render(
    <MemoryRouter initialEntries={['/laporan-surat/55']}>
      <Routes>
        <Route path="/laporan-surat/:id" element={<LaporanBySurat />} />
        <Route path="/laporan/:suratId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

  expect(screen.getByTestId('location')).toHaveTextContent('/laporan/55');
});
