import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import axios from '../api/axios';
import {
  getLaporanPerjalanan,
  kirimLaporanAkhir,
  uploadTTD,
  getTTD,
  uploadBuktiPembayaran,
  getBuktiPembayaran,
  resetBuktiPembayaran,
} from './laporan.service';
import { submitLaporan } from './presensiService';

describe('kontrak service laporan berbasis surat tugas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axios.get.mockResolvedValue({ data: {} });
    axios.post.mockResolvedValue({ data: {} });
    axios.put.mockResolvedValue({ data: {} });
    axios.delete.mockResolvedValue({ data: {} });
  });

  it('memuat progres dari URL surat tugas yang dipilih', async () => {
    axios.get.mockResolvedValueOnce({ data: { surat_tugas: { id: 41 } } });

    const result = await getLaporanPerjalanan(41);

    expect(result.surat_tugas.id).toBe(41);
    expect(axios.get).toHaveBeenCalledWith('/perjalanan/surat/41');
  });

  it('mengikat seluruh aksi laporan ke surat tugas yang sama', async () => {
    const payload = { kesimpulan: 'Hasil perjalanan' };
    const ttd = new FormData();
    const nota = new FormData();

    await kirimLaporanAkhir(41, payload);
    await uploadTTD(41, ttd);
    await getTTD(41);
    await uploadBuktiPembayaran(41, nota);
    await getBuktiPembayaran(41);
    await resetBuktiPembayaran(41);

    expect(axios.post).toHaveBeenCalledWith('/perjalanan/surat/41/kirim', payload);
    expect(axios.post).toHaveBeenCalledWith(
      '/perjalanan/surat/41/ttd-pegawai',
      ttd,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    expect(axios.get).toHaveBeenCalledWith('/perjalanan/surat/41/ttd-pegawai');
    expect(axios.post).toHaveBeenCalledWith(
      '/perjalanan/surat/41/bukti-pembayaran',
      nota,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    expect(axios.get).toHaveBeenCalledWith('/perjalanan/surat/41/bukti-pembayaran');
    expect(axios.delete).toHaveBeenCalledWith('/perjalanan/surat/41/bukti-pembayaran');
  });

  it('menolak ID kosong atau bukan integer positif sebelum mengirim request', async () => {
    for (const suratId of [undefined, '', 0, -1, 'abc', '1.5']) {
      await expect(getLaporanPerjalanan(suratId)).rejects.toThrow('suratId wajib diisi');
    }

    expect(axios.get).not.toHaveBeenCalled();
  });

  it('mengirim laporan harian melalui ID presensi di URL', async () => {
    await submitLaporan(73, 'Ringkasan kegiatan harian');

    expect(axios.put).toHaveBeenCalledWith(
      '/presensi/73/laporan',
      { laporan: 'Ringkasan kegiatan harian' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });
});
