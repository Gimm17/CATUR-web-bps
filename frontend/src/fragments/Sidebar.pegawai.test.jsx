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

  test('menampilkan Dashboard dan Daftar Laporan sebagai label menu pegawai', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Laporan & Statistik/i }))
      .toHaveAttribute('href', '/laporan');
    expect(screen.getByRole('link', { name: /^Dashboard 2026$/i }))
      .toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /^Daftar Laporan$/i }))
      .toHaveAttribute('href', '/laporan-report');
    expect(screen.queryByRole('link', { name: /Dashboard Sensus/i }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Report$/i }))
      .not.toBeInTheDocument();
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
