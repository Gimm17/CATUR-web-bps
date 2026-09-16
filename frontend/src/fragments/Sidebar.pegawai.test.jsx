import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test } from 'vitest';

import Sidebar from './Sidebar.pegawai';

describe('Sidebar pegawai', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
  });

  test('menampilkan Laporan & Statistik dan Report sebagai dua menu terpisah', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Laporan & Statistik/i }))
      .toHaveAttribute('href', '/laporan');
    expect(screen.getByRole('link', { name: /^Report$/i }))
      .toHaveAttribute('href', '/laporan-report');
    expect(screen.queryByRole('link', { name: /Riwayat Laporan/i }))
      .not.toBeInTheDocument();
  });

  test('menggunakan URL logo absolut agar tetap valid pada route bertingkat', () => {
    render(
      <MemoryRouter initialEntries={['/laporan/225']}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('img', { name: 'Logo BPS' }))
      .toHaveAttribute('src', '/img/logo.png');
  });
});
