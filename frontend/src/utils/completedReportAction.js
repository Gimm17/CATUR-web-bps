export function getCompletedReportAction(surat, laporanFile) {
  if (laporanFile) {
    return { available: true, href: null, label: 'Lihat PDF Laporan' };
  }

  if (surat?.id) {
    return {
      available: true,
      href: `/laporan/${surat.id}`,
      label: 'Buka Laporan',
    };
  }

  return { available: false, href: null, label: 'Laporan Tidak Tersedia' };
}
