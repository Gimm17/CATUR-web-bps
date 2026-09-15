export function getCompletedReportAction(surat) {
  if (surat?.id) {
    return {
      available: true,
      href: `/laporan/${surat.id}`,
      label: 'Buka Laporan',
    };
  }

  return { available: false, href: null, label: 'Laporan Tidak Tersedia' };
}
