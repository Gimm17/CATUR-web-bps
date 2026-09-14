import { describe, expect, it } from 'vitest';
import { getReportWindowPresentation } from './reportWindow';

describe('getReportWindowPresentation', () => {
  it('menyajikan masa edit aktif dari nilai backend', () => {
    expect(getReportWindowPresentation({
      editable: true,
      remaining_days: 4,
      deadline_date: '2026-09-18',
    })).toEqual({
      tone: 'success',
      title: 'Laporan masih dapat diubah',
      message: 'Sisa 4 hari, sampai 2026-09-18.',
      editable: true,
    });
  });

  it('menandai hari terakhir tanpa menghitung ulang timezone', () => {
    expect(getReportWindowPresentation({
      editable: true,
      remaining_days: 0,
      deadline_date: '2026-09-14',
    })).toMatchObject({
      tone: 'danger',
      title: 'Hari terakhir penyelesaian laporan',
      editable: true,
    });
  });

  it('menjelaskan deadline yang sudah lewat', () => {
    expect(getReportWindowPresentation({
      editable: false,
      lock_reason: 'deadline_passed',
      deadline_date: '2026-09-13',
    })).toEqual({
      tone: 'danger',
      title: 'Batas laporan berakhir',
      message: 'Laporan terkunci sejak 2026-09-13.',
      editable: false,
    });
  });

  it('membedakan penguncian selama proses keuangan', () => {
    expect(getReportWindowPresentation({
      editable: false,
      lock_reason: 'finance_processing',
    })).toEqual({
      tone: 'warning',
      title: 'Laporan sedang diproses',
      message: 'Perubahan dikunci selama proses keuangan.',
      editable: false,
    });
  });
});
