import axios from '../api/axios';

export const getPegawai = async () => {
  const res = await axios.get('/getpegawai');
  return res.data;
};
export const getPegawaiCount = async () => {
  const res = await axios.get("/getpegawai/count");
  return res.data;
};
