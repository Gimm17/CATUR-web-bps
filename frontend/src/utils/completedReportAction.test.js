import { describe, expect, it } from 'vitest';

import { getCompletedReportAction } from './completedReportAction';

describe('getCompletedReportAction', () => {
  it('membuka halaman laporan untuk surat selesai yang belum memiliki PDF', () => {
    expect(getCompletedReportAction({
      id: 207,
      statusInfo: { status: 'expired' },
    }, null)).toEqual({
      available: true,
      href: '/laporan/207',
      label: 'Buka Laporan',
    });
  });

  it('tidak membuat target ketika ID surat tidak tersedia', () => {
    expect(getCompletedReportAction({ statusInfo: { status: 'expired' } }, null))
      .toEqual({ available: false, href: null, label: 'Laporan Tidak Tersedia' });
  });
});
