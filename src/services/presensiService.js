import axios from '../api/axios';

export const submitPresensi = async (formData) => {
  return axios.post('/presensi/absen', formData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const submitLaporan = async (presensiId, laporan) => {
  return axios.put(`/presensi/${presensiId}/laporan`, { laporan }, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });
};

export const cekStatusPresensi = async () => {
  return axios.get('/presensi/status', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
};
