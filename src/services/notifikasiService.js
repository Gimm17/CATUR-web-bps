import axios from '../api/axios';

export const getNotifikasi = async () => {
  const res = await axios.get('/notifikasi', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return res.data;
};

export const readNotifikasi = async (id) => {
  return axios.put(`/notifikasi/${id}/read`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
};
