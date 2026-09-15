import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '../api/axios';
import Login from './login';

vi.mock('../api/axios', () => ({
  default: { post: vi.fn() },
}));

vi.mock('../utils/browserNavigation', () => ({
  redirectBrowser: vi.fn(),
}));

describe('login berhasil memicu changelog', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    api.post.mockReset();
  });

  it('menandai redirect berikutnya setelah token dan user diterima', async () => {
    api.post.mockResolvedValue({
      data: {
        token: 'valid-token',
        user: { id: 87, nama: 'Pegawai Uji', role: 'pegawai' },
      },
    });

    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    const loginForm = container.querySelector('.login-container form');
    const emailInput = loginForm.querySelector('input[name="email"]');
    const passwordInput = loginForm.querySelector('input[name="password"]');

    await userEvent.type(emailInput, 'pegawai@catur.test');
    await userEvent.type(passwordInput, 'rahasia');
    await userEvent.click(loginForm.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(sessionStorage.getItem('catur:show-changelog-after-login')).toBe('true');
    });
  });
});
