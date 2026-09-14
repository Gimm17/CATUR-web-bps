import { describe, expect, it } from 'vitest';
import { countScheduledDays } from './tujuanDuration';

describe('countScheduledDays', () => {
  it('menghitung seluruh hari dari dua tujuan berurutan', () => {
    expect(countScheduledDays([
      { tanggal_mulai: '2026-09-14', tanggal_selesai: '2026-09-16' },
      { tanggal_mulai: '2026-09-17', tanggal_selesai: '2026-09-19' },
    ])).toBe(6);
  });

  it('tidak menghitung dua kali tanggal tujuan yang overlap', () => {
    expect(countScheduledDays([
      { tanggal_mulai: '2026-09-14', tanggal_selesai: '2026-09-16' },
      { tanggal_mulai: '2026-09-16', tanggal_selesai: '2026-09-17' },
    ])).toBe(4);
  });

  it('mengabaikan rentang invalid secara defensif', () => {
    expect(countScheduledDays([
      { tanggal_mulai: 'invalid', tanggal_selesai: '2026-09-16' },
      { tanggal_mulai: '2026-09-18', tanggal_selesai: '2026-09-17' },
    ])).toBe(0);
  });
});
