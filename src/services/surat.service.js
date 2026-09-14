import axios from '../api/axios';

export const getSuratTugasAktif = async () => {
  const res = await axios.get('/surat-tugas/aktif', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return res.data;
};

export const getSuratTugasAktifAtauNull = async () => {
  try {
    return await getSuratTugasAktif();
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};
