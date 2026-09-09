function slugifySegment(value, fallback = 'unknown') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || fallback;
}

function buildReportBaseName({ pegawai, surat, prefix = 'laporan-perjalanan-dinas' } = {}) {
  const namaPegawai = slugifySegment(pegawai?.nama, 'pegawai');
  const nomorSurat = slugifySegment(surat?.nomor_surat, 'surat');
  return `${prefix}-${namaPegawai}-${nomorSurat}`;
}

module.exports = {
  slugifySegment,
  buildReportBaseName,
};
