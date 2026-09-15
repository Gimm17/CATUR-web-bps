import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

import axios from '../api/axios';
import { getSuratTugasAktifAtauNull } from './surat.service';

describe('getSuratTugasAktifAtauNull', () => {
  beforeEach(() => vi.resetAllMocks());

  it('mengembalikan surat selesai terbaru sebagai konteks read-only ketika tidak ada surat aktif', async () => {
    axios.get
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: [
          { id: 11, tanggal_mulai: '2026-09-01', tanggal_selesai: '2026-09-09' },
          { id: 12, tanggal_mulai: '2026-09-10', tanggal_selesai: '2026-09-12' },
        ],
      });

    await expect(getSuratTugasAktifAtauNull('2026-09-15')).resolves.toMatchObject({ id: 12 });
    expect(axios.get).toHaveBeenNthCalledWith(2, '/surat-tugas/');
  });

  it('memprioritaskan surat mendatang terdekat daripada surat yang sudah selesai', async () => {
    axios.get
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: [
          { id: 12, tanggal_mulai: '2026-09-10', tanggal_selesai: '2026-09-12' },
          { id: 13, tanggal_mulai: '2026-09-18', tanggal_selesai: '2026-09-20' },
          { id: 14, tanggal_mulai: '2026-10-01', tanggal_selesai: '2026-10-03' },
        ],
      });

    await expect(getSuratTugasAktifAtauNull('2026-09-15')).resolves.toMatchObject({ id: 13 });
  });

  it('mengembalikan null jika pegawai belum pernah memiliki surat tugas', async () => {
    axios.get
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: [] });

    await expect(getSuratTugasAktifAtauNull('2026-09-15')).resolves.toBeNull();
  });

  it('tetap meneruskan kegagalan server', async () => {
    const serverError = { response: { status: 500 } };
    axios.get.mockRejectedValueOnce(serverError);

    await expect(getSuratTugasAktifAtauNull()).rejects.toBe(serverError);
  });
});
