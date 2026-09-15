import axios from '../api/axios';

export const getSuratTugasAktif = async () => {
  const res = await axios.get('/surat-tugas/aktif', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return res.data;
};

const getBusinessDateWita = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const normalizeDateOnly = (value) => String(value || '').slice(0, 10);

const selectPresensiFallback = (assignments, businessDate) => {
  const validAssignments = Array.isArray(assignments)
    ? assignments.filter((item) => (
        normalizeDateOnly(item?.tanggal_mulai) && normalizeDateOnly(item?.tanggal_selesai)
      ))
    : [];

  const upcoming = validAssignments
    .filter((item) => normalizeDateOnly(item.tanggal_mulai) > businessDate)
    .sort((left, right) => (
      normalizeDateOnly(left.tanggal_mulai).localeCompare(normalizeDateOnly(right.tanggal_mulai))
    ));
  if (upcoming.length > 0) return upcoming[0];

  const expired = validAssignments
    .filter((item) => normalizeDateOnly(item.tanggal_selesai) < businessDate)
    .sort((left, right) => (
      normalizeDateOnly(right.tanggal_selesai).localeCompare(normalizeDateOnly(left.tanggal_selesai))
    ));
  return expired[0] || null;
};

export const getSuratTugasAktifAtauNull = async (businessDate = getBusinessDateWita()) => {
  try {
    return await getSuratTugasAktif();
  } catch (error) {
    if (error?.response?.status === 404) {
      const response = await axios.get('/surat-tugas/');
      return selectPresensiFallback(response.data, businessDate);
    }
    throw error;
  }
};
