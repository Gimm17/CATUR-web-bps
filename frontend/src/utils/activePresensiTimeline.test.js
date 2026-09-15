import { describe, expect, it, vi } from 'vitest';
import { loadActivePresensiTimeline } from './activePresensiTimeline';

describe('loadActivePresensiTimeline', () => {
  it('tidak meminta laporan ketika tidak ada surat aktif', async () => {
    const getLaporan = vi.fn();

    await expect(loadActivePresensiTimeline(null, getLaporan)).resolves.toEqual([]);
    expect(getLaporan).not.toHaveBeenCalled();
  });

  it('meminta laporan dengan ID surat aktif dan membatasi tanggalnya', async () => {
    const getLaporan = vi.fn().mockResolvedValue({
      presensi: [
        { id: 1, tanggal_presensi: '2026-09-09' },
        { id: 2, tanggal_presensi: '2026-09-10' },
        { id: 3, tanggal_presensi: '2026-09-13' },
      ],
    });
    const surat = {
      id: 225,
      tanggal_mulai: '2026-09-10',
      tanggal_selesai: '2026-09-12',
    };

    const result = await loadActivePresensiTimeline(surat, getLaporan);

    expect(getLaporan).toHaveBeenCalledWith(225);
    expect(result).toEqual([{ id: 2, tanggal_presensi: '2026-09-10', hari_ke: 1 }]);
  });
});
