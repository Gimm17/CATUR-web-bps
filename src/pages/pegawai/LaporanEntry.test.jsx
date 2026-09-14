import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../services/surat.service', () => ({
  getSuratTugasAktif: vi.fn(),
}));

import { getSuratTugasAktif } from '../../services/surat.service';
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
  it('mengarahkan satu surat aktif ke halaman progres berdasarkan ID', async () => {
    getSuratTugasAktif.mockResolvedValueOnce({ id: 41, nomor_surat: 'ST-41' });

    renderEntry();

    expect(await screen.findByTestId('location')).toHaveTextContent('/laporan/41');
  });

  it('mengarahkan pegawai tanpa surat aktif ke riwayat laporan', async () => {
    getSuratTugasAktif.mockRejectedValueOnce({ response: { status: 404 } });

    renderEntry();

    expect(await screen.findByTestId('location')).toHaveTextContent('/laporan-report');
  });

  it('menampilkan error dan menyediakan percobaan ulang untuk kegagalan server', async () => {
    getSuratTugasAktif.mockRejectedValueOnce({ response: { status: 500 } });

    renderEntry();

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal memeriksa surat tugas aktif');
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
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
