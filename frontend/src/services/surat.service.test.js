import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

import axios from '../api/axios';
import { getSuratTugasAktifAtauNull } from './surat.service';

describe('getSuratTugasAktifAtauNull', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mengubah 404 menjadi empty state tanpa error UI', async () => {
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });

    await expect(getSuratTugasAktifAtauNull()).resolves.toBeNull();
  });

  it('tetap meneruskan kegagalan server', async () => {
    const serverError = { response: { status: 500 } };
    axios.get.mockRejectedValueOnce(serverError);

    await expect(getSuratTugasAktifAtauNull()).rejects.toBe(serverError);
  });
});
