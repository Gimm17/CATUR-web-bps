import axios from '../api/axios';

/**
 * Mendapatkan semua surat tugas, bisa difilter berdasarkan user_id
 * @param {number|null} userId - ID user untuk filter (opsional)
 * @returns {Promise<Array>} - Array surat tugas
 */
export const getAllSuratTugas = async (userId = null) => {
  try {
    // Bangun URL dengan query parameter jika userId diberikan
    let url = '/surat-tugas/';
    if (userId) {
      url += `?user_id=${userId}`;
    }
    
    console.log('📡 Memanggil API getAllSuratTugas:', url);
    const res = await axios.get(url);
    console.log('✅ Response getAllSuratTugas:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error getAllSuratTugas:', error);
    console.error('Response error:', error.response?.data);
    // Return array kosong agar tidak crash
    return [];
  }
};

/**
 * Mendapatkan surat tugas berdasarkan user_id (endpoint khusus)
 * @param {number} userId - ID user
 * @returns {Promise<Object>} - Object dengan property data
 */
export const getSuratTugasByUserId = async (userId) => {
  try {
    console.log('📡 Memanggil API getSuratTugasByUserId untuk user:', userId);
    const res = await axios.get(`/surat-tugas/user/${userId}`);
    console.log('✅ Response getSuratTugasByUserId:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error getSuratTugasByUserId:', error);
    console.error('Response error:', error.response?.data);
    // Return object dengan data kosong
    return { 
      success: false, 
      data: [], 
      message: error.message 
    };
  }
};

/**
 * Mendapatkan surat tugas berdasarkan ID
 * @param {number|string} id - ID surat tugas
 * @returns {Promise<Object>} - Data surat tugas
 */
export const getSuratTugasById = async (id) => {
  try {
    const res = await axios.get(`/surat-tugas/${id}`);
    return res.data;
  } catch (error) {
    console.error('Error getSuratTugasById:', error);
    throw error;
  }
};

/**
 * Mendapatkan surat tugas aktif untuk user yang login
 * @returns {Promise<Object>} - Data surat tugas aktif
 */
export const getSuratTugasAktif = async () => {
  try {
    console.log('📡 Memanggil API getSuratTugasAktif');
    const res = await axios.get('/surat-tugas/aktif');
    console.log('✅ Response getSuratTugasAktif:', res.data);
    return res.data;
  } catch (error) {
    console.error('❌ Error getSuratTugasAktif:', error);
    throw error;
  }
};

/**
 * Mendapatkan statistik dashboard
 * @returns {Promise<Object>} - Object statistik
 */
export const getDashboardStats = async () => {
  try {
    const res = await axios.get('/surat-tugas/stats');
    return res.data;
  } catch (error) {
    console.error('Error getDashboardStats:', error);
    throw error;
  }
};

/**
 * Membuat surat tugas baru
 * @param {FormData} formData - Form data dengan file
 * @returns {Promise} - Response axios
 */
export const createSuratTugas = async (formData) => {
  try {
    const res = await axios.post('/surat-tugas/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res;
  } catch (error) {
    console.error('Error createSuratTugas:', error);
    throw error;
  }
};

/**
 * Mengupdate surat tugas
 * @param {number} id - ID surat tugas
 * @param {Object} data - Data yang diupdate
 * @returns {Promise} - Response axios
 */
export const updateSuratTugas = async (id, data) => {
  try {
    const res = await axios.put(`/surat-tugas/${id}`, data);
    return res;
  } catch (error) {
    console.error('Error updateSuratTugas:', error);
    throw error;
  }
};

/**
 * Menghapus surat tugas
 * @param {number} id - ID surat tugas
 * @returns {Promise} - Response axios
 */
export const deleteSuratTugas = async (id) => {
  try {
    const res = await axios.delete(`/surat-tugas/${id}`);
    return res;
  } catch (error) {
    console.error('Error deleteSuratTugas:', error);
    throw error;
  }
};
