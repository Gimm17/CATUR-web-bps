export function getReportWindowPresentation(reportWindow = {}) {
  if (reportWindow.lock_reason === 'finance_processing') {
    return {
      tone: 'warning',
      title: 'Laporan sedang diproses',
      message: 'Perubahan dikunci selama proses keuangan.',
      editable: false,
    };
  }

  if (reportWindow.lock_reason === 'deadline_passed') {
    return {
      tone: 'danger',
      title: 'Batas laporan berakhir',
      message: `Laporan terkunci sejak ${reportWindow.deadline_date}.`,
      editable: false,
    };
  }

  if (reportWindow.editable && reportWindow.remaining_days === 0) {
    return {
      tone: 'danger',
      title: 'Hari terakhir penyelesaian laporan',
      message: 'Selesaikan laporan hari ini sebelum 23:59 WITA.',
      editable: true,
    };
  }

  return {
    tone: reportWindow.editable ? 'success' : 'warning',
    title: reportWindow.editable ? 'Laporan masih dapat diubah' : 'Laporan terkunci',
    message: reportWindow.editable
      ? `Sisa ${reportWindow.remaining_days} hari, sampai ${reportWindow.deadline_date}.`
      : 'Perubahan laporan tidak tersedia.',
    editable: Boolean(reportWindow.editable),
  };
}
