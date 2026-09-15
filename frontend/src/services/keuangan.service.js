// services/keuangan.service.js
import axios from '../api/axios';

export const getLaporanKeuangan = async () => {
  try {
    const res = await axios.get('/keuangan/laporan');
    return res.data;
  } catch (err) {
    console.error("Error getLaporanKeuangan:", err);
    throw err;
  }
};

export const kembalikanLaporan = async (id, catatan) => {
  try {
    const res = await axios.put(`/keuangan/kembalikan/${id}`, {
      catatan: catatan
    });
    return res.data;
  } catch (err) {
    console.error("Error kembalikanLaporan:", err);
    throw err;
  }
};

export const teruskanKeAtasan = async (id, data) => {
  try {
    const res = await axios.put(`/keuangan/teruskan/${id}`, data);
    return res.data;
  } catch (err) {
    console.error("Error teruskanKeAtasan:", err);
    throw err;
  }
};

export const cairkanDana = async (id, formData) => {
  try {
    console.log(`Mencairkan dana untuk laporan ID: ${id}`);
    
    const res = await axios.put(`/keuangan/cairkan/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log("Response cairkan dana:", res.data);
    return res.data;
  } catch (err) {
    console.error("Error cairkanDana:", err);
    let errorMessage = 'Gagal mencairkan dana';
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    }
    throw new Error(errorMessage);
  }
};

export const getBuktiNotaKeuangan = async (id) => {
  try {
    const res = await axios.get(`/keuangan/nota/${id}`);
    return res.data;
  } catch (err) {
    console.error("Error getBuktiNotaKeuangan:", err);
    throw err;
  }
};

export const exportLaporanKeuanganExcel = async (params = {}) => {
  try {
    const res = await axios.get('/keuangan/export/excel', {
      params,
      responseType: 'blob'
    });
    return res.data;
  } catch (err) {
    console.error("Error exportLaporanKeuanganExcel:", err);
    throw err;
  }
};

export const exportLaporanKeuanganPdf = async (params = {}) => {
  try {
    const res = await axios.get('/keuangan/export/pdf', {
      params,
      responseType: 'blob'
    });
    return res.data;
  } catch (err) {
    console.error("Error exportLaporanKeuanganPdf:", err);
    throw err;
  }
};
