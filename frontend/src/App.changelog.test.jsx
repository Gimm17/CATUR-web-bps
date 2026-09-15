import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import App from './App';

const SHOW_AFTER_LOGIN_KEY = 'catur:show-changelog-after-login';
const DISMISSED_VERSION_KEY = 'catur:changelog:dismissed-version';
const CURRENT_VERSION = '2026-09-15-task-028';

function prepareSuccessfulLoginRedirect() {
  localStorage.setItem('token', 'valid-token');
  localStorage.setItem('user', JSON.stringify({ id: 87, role: 'pegawai' }));
  sessionStorage.setItem(SHOW_AFTER_LOGIN_KEY, 'true');
}

describe('popup changelog setelah login', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'catur_changelog_dismissed=; Max-Age=0; Path=/';
    window.history.replaceState({}, '', '/');
  });

  it('muncul hanya ketika sesi ditandai berasal dari login berhasil', () => {
    const firstRender = render(<App />);
    expect(screen.queryByRole('dialog', { name: /yang baru di catur/i })).not.toBeInTheDocument();

    firstRender.unmount();
    prepareSuccessfulLoginRedirect();
    render(<App />);

    expect(screen.getByRole('dialog', { name: /yang baru di catur/i })).toBeInTheDocument();
  });

  it('tombol Mengerti menutup popup hanya untuk sesi login saat ini', async () => {
    prepareSuccessfulLoginRedirect();
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Mengerti' }));

    expect(screen.queryByRole('dialog', { name: /yang baru di catur/i })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(SHOW_AFTER_LOGIN_KEY)).toBeNull();
    expect(localStorage.getItem(DISMISSED_VERSION_KEY)).toBeNull();
  });

  it('tombol Escape menutup popup tanpa menyembunyikan versi', async () => {
    prepareSuccessfulLoginRedirect();
    render(<App />);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: /yang baru di catur/i })).not.toBeInTheDocument();
    expect(localStorage.getItem(DISMISSED_VERSION_KEY)).toBeNull();
  });

  it('Jangan tampilkan lagi menyembunyikan versi yang sama pada login berikutnya', async () => {
    prepareSuccessfulLoginRedirect();
    const firstRender = render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /jangan tampilkan lagi/i }));

    expect(localStorage.getItem(DISMISSED_VERSION_KEY)).toBe(CURRENT_VERSION);
    expect(screen.queryByRole('dialog', { name: /yang baru di catur/i })).not.toBeInTheDocument();

    firstRender.unmount();
    sessionStorage.setItem(SHOW_AFTER_LOGIN_KEY, 'true');
    render(<App />);

    expect(screen.queryByRole('dialog', { name: /yang baru di catur/i })).not.toBeInTheDocument();
  });

  it('pilihan jangan tampilkan lagi tetap berlaku setelah penyimpanan autentikasi dibersihkan saat logout', async () => {
    prepareSuccessfulLoginRedirect();
    const firstRender = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /jangan tampilkan lagi/i }));

    firstRender.unmount();
    localStorage.clear();
    prepareSuccessfulLoginRedirect();
    render(<App />);

    expect(screen.queryByRole('dialog', { name: /yang baru di catur/i })).not.toBeInTheDocument();
  });
});
