import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

import axios from '../api/axios';
import {
  getSuratTugasAktifAtauNull,
  getSuratTugasLaporanDefault,
} from './surat.service';

describe('getSuratTugasAktifAtauNull', () => {
  beforeEach(() => vi.resetAllMocks());

  it('menggunakan fallback tanpa error network ketika endpoint aktif mengembalikan data null', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          data: null,
          message: 'Tidak ada surat tugas aktif hari ini',
        },
      })
      .mockResolvedValueOnce({
        data: [
          { id: 11, tanggal_mulai: '2026-09-01', tanggal_selesai: '2026-09-09' },
          { id: 12, tanggal_mulai: '2026-09-10', tanggal_selesai: '2026-09-12' },
        ],
      });

    await expect(getSuratTugasAktifAtauNull('2026-09-15')).resolves.toMatchObject({ id: 12 });
    expect(axios.get).toHaveBeenNthCalledWith(2, '/surat-tugas/');
  });

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

describe('getSuratTugasLaporanDefault', () => {
  beforeEach(() => vi.resetAllMocks());

  it('mengembalikan surat aktif melalui satu request daftar surat', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          id: 41,
          status: 'AKTIF',
          tanggal_mulai: '2026-09-14',
          tanggal_selesai: '2026-09-16',
          tujuan: [],
        },
      ],
    });

    await expect(getSuratTugasLaporanDefault('2026-09-15'))
      .resolves.toMatchObject({ id: 41 });
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith('/surat-tugas/');
  });

  it('mengenali surat aktif dari jadwal tujuan multi-lokasi', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        {
          id: 42,
          status: 'AKTIF',
          tanggal_mulai: '2026-09-10',
          tanggal_selesai: '2026-09-20',
          tujuan: [
            { tanggal_mulai: '2026-09-10', tanggal_selesai: '2026-09-12' },
            { tanggal_mulai: '2026-09-16', tanggal_selesai: '2026-09-18' },
          ],
        },
      ],
    });

    await expect(getSuratTugasLaporanDefault('2026-09-17'))
      .resolves.toMatchObject({ id: 42 });
  });

  it('menolak kondisi ambigu ketika lebih dari satu surat aktif pada tanggal yang sama', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        { id: 41, status: 'AKTIF', tanggal_mulai: '2026-09-14', tanggal_selesai: '2026-09-16' },
        { id: 42, status: 'aktif', tanggal_mulai: '2026-09-15', tanggal_selesai: '2026-09-17' },
      ],
    });

    await expect(getSuratTugasLaporanDefault('2026-09-15')).rejects.toMatchObject({
      code: 'ACTIVE_ASSIGNMENT_CONFLICT',
      assignmentIds: [41, 42],
    });
  });

  it('memilih surat selesai terbaru dan mengabaikan surat mendatang', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        { id: 224, status: 'AKTIF', tanggal_mulai: '2026-09-01', tanggal_selesai: '2026-09-09' },
        { id: 225, status: 'AKTIF', tanggal_mulai: '2026-09-10', tanggal_selesai: '2026-09-12' },
        { id: 226, status: 'AKTIF', tanggal_mulai: '2026-09-20', tanggal_selesai: '2026-09-22' },
      ],
    });

    await expect(getSuratTugasLaporanDefault('2026-09-15'))
      .resolves.toMatchObject({ id: 225 });
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('mengembalikan null ketika belum ada surat aktif atau selesai', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
        { id: 226, status: 'AKTIF', tanggal_mulai: '2026-09-20', tanggal_selesai: '2026-09-22' },
      ],
    });

    await expect(getSuratTugasLaporanDefault('2026-09-15')).resolves.toBeNull();
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
