const STATUS_RANK = {
  draft: 0,
  dikirim: 1,
  dicek_keuangan: 2,
  disetujui_keuangan: 3,
  ditandatangani: 4,
  pencairan_dana: 5,
  dana_turun: 6,
};

const getPhotoCount = (presensi = {}) => {
  if (Array.isArray(presensi.foto_list)) return presensi.foto_list.filter(Boolean).length;
  if (!presensi.foto) return 0;
  try {
    const parsed = JSON.parse(presensi.foto);
    return Array.isArray(parsed) ? parsed.filter(Boolean).length : 1;
  } catch {
    return 1;
  }
};

export function mergeAssignmentReportContext(assignment, context) {
  if (!context || typeof context !== 'object') return assignment;

  const presensi = Array.isArray(context.presensi)
    ? context.presensi
    : (assignment.presensi || []);

  return {
    ...assignment,
    laporan: context.laporan_akhir ?? assignment.laporan ?? null,
    presensi,
    presensi_count: presensi.length || Number(assignment.presensi_count || 0),
    bukti_pembayaran: Array.isArray(context.bukti_pembayaran)
      ? context.bukti_pembayaran
      : (assignment.bukti_pembayaran || []),
    pembayaran: context.pembayaran ?? assignment.pembayaran ?? null,
    report_window: context.report_window ?? assignment.report_window ?? null,
  };
}

export function buildReportProcessTimeline(assignment = {}) {
  const laporan = assignment.laporan || {};
  const pembayaran = assignment.pembayaran || {};
  const presensi = Array.isArray(assignment.presensi) ? assignment.presensi : [];
  const duration = Number(
    assignment.statusInfo?.durasiHari
      ?? assignment.statusInfo?.durasi
      ?? assignment.durasi
      ?? 0,
  );
  const attendanceCount = presensi.length || Number(assignment.presensi_count || 0);
  const photosComplete = presensi.length === 0
    || presensi.every((item) => getPhotoCount(item) >= 2);
  const attendanceComplete = duration > 0
    && attendanceCount >= duration
    && photosComplete;
  const status = String(laporan.status || 'draft').toLowerCase();
  const rank = STATUS_RANK[status] ?? 0;
  const hasEmployeeSignature = Boolean(laporan.ttd_pegawai);
  const hasReceipts = Array.isArray(assignment.bukti_pembayaran)
    && assignment.bukti_pembayaran.length > 0;
  const lastAttendanceDate = presensi
    .map((item) => item?.tanggal_presensi)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  const stages = [
    {
      label: 'Presensi Harian',
      description: `${attendanceCount}/${duration || 0} hari presensi lengkap`,
      completed: attendanceComplete,
      date: lastAttendanceDate,
    },
    {
      label: 'Tambahkan Tanda Tangan',
      description: 'Tanda tangan digital pegawai untuk laporan',
      completed: hasEmployeeSignature,
      date: laporan.tanggal_ttd_pegawai || null,
    },
    {
      label: 'Upload Bukti Nota Dinas',
      description: hasReceipts ? 'Bukti nota telah diunggah' : 'Tahap opsional',
      completed: hasReceipts,
      optional: true,
      date: assignment.bukti_pembayaran?.at(-1)?.uploaded_at || null,
    },
    {
      label: 'Kirim Laporan Akhir',
      description: 'Laporan akhir dikirim oleh pegawai',
      completed: rank >= 1,
      date: laporan.tanggal_kirim || laporan.created_at || null,
    },
    {
      label: 'Pengecekan Keuangan',
      description: 'Tim keuangan memverifikasi kelengkapan dokumen',
      completed: rank >= 2,
      date: rank === 2 ? (laporan.updated_at || null) : (laporan.tanggal_verifikasi_keuangan || null),
    },
    {
      label: 'Disetujui Keuangan',
      description: 'Laporan dinyatakan lengkap oleh keuangan',
      completed: rank >= 3,
      date: laporan.tanggal_verifikasi_keuangan || laporan.tanggal_acc || null,
    },
    {
      label: 'TTD & Persetujuan Atasan',
      description: 'Atasan menandatangani dan menyetujui laporan',
      completed: rank >= 4,
      date: laporan.tanggal_ttd || null,
    },
    {
      label: 'Pengajuan Pencairan Dana',
      description: 'Keuangan memproses pencairan dana perjalanan',
      completed: rank >= 5,
      date: rank === 5 ? (laporan.updated_at || null) : null,
    },
    {
      label: 'Dana Diturunkan',
      description: 'Dana telah ditransfer dan bukti tersedia',
      completed: rank >= 6,
      date: pembayaran.tanggal_transfer || laporan.tanggal_transfer || null,
    },
  ];

  const currentIndex = stages.findIndex((stage) => !stage.optional && !stage.completed);
  return stages.map((stage, index) => ({
    ...stage,
    state: stage.completed
      ? 'completed'
      : (stage.optional ? 'optional' : (index === currentIndex ? 'current' : 'pending')),
  }));
}
