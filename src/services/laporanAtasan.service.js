import axios from '../api/axios';

export const getLaporanAtasan = async () => {
  const res = await axios.get('/laporan');
  return res.data;
};

export const getProgresPegawai = async () => {
  const res = await axios.get('/progres-pegawai');
  return res.data;
};

export const approveLaporanAtasan = async (id, formData) => {
  const res = await axios.post(`/laporan/${id}/approve`, formData);
  return res.data;
};