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

const getAssignmentSchedule = (assignment) => (
  Array.isArray(assignment?.tujuan) && assignment.tujuan.length > 0
    ? assignment.tujuan
    : [assignment]
);

const isScheduledOn = (assignment, businessDate) => getAssignmentSchedule(assignment)
  .some((item) => {
    const startDate = normalizeDateOnly(item?.tanggal_mulai);
    const endDate = normalizeDateOnly(item?.tanggal_selesai);
    return startDate && endDate && startDate <= businessDate && businessDate <= endDate;
  });

const getAssignmentEndDate = (assignment) => getAssignmentSchedule(assignment)
  .map((item) => normalizeDateOnly(item?.tanggal_selesai))
  .filter(Boolean)
  .sort((left, right) => right.localeCompare(left))[0] || '';

const selectActiveAssignment = (assignments, businessDate) => {
  const active = Array.isArray(assignments)
    ? assignments.filter((item) => (
        Number(item?.id) > 0
        && String(item?.status || '').toLowerCase() === 'aktif'
        && isScheduledOn(item, businessDate)
      ))
    : [];

  if (active.length > 1) {
    const error = new Error('Lebih dari satu surat tugas aktif ditemukan pada tanggal yang sama.');
    error.code = 'ACTIVE_ASSIGNMENT_CONFLICT';
    error.assignmentIds = active.map((item) => Number(item.id)).sort((left, right) => left - right);
    throw error;
  }

  return active[0] || null;
};

const selectLatestCompletedAssignment = (assignments, businessDate) => {
  const completed = Array.isArray(assignments)
    ? assignments.filter((item) => (
        Number(item?.id) > 0
        && getAssignmentEndDate(item)
        && getAssignmentEndDate(item) < businessDate
      ))
    : [];

  completed.sort((left, right) => {
    const byEndDate = getAssignmentEndDate(right)
      .localeCompare(getAssignmentEndDate(left));
    if (byEndDate !== 0) return byEndDate;
    return Number(right.id) - Number(left.id);
  });

  return completed[0] || null;
};

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

export const getSuratTugasLaporanDefault = async (businessDate = getBusinessDateWita()) => {
  const response = await axios.get('/surat-tugas/');
  return selectActiveAssignment(response.data, businessDate)
    || selectLatestCompletedAssignment(response.data, businessDate);
};
