import axios from '../api/axios';

export const getLaporanPerjalanan = async () => {
  try {
    console.log('Fetching laporan perjalanan...');
    const response = await axios.get('/perjalanan');
    console.log('Laporan response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching laporan:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response?.status === 404 || error.response?.status === 401) {
      return {
        success: false,
        message: error.response?.data?.message || 'Tidak dapat mengakses data',
        user: null,
        surat_tugas: null,
      presensi: [],
      laporan_akhir: null,
      pembayaran: null,
      bukti_pembayaran: []
    };
    }
    
    throw error;
  }
};

export const kirimLaporanAkhir = async (payload) => {
  try {
    console.log('Kirim laporan akhir:', payload);
    const response = await axios.post('/perjalanan/kirim', payload);
    console.log('Kirim response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error kirim laporan:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const uploadTTD = async (formData) => {
  try {
    console.log('Upload TTD independent...');
    
    const response = await axios.post('/perjalanan/ttd-pegawai', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('TTD upload response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error upload TTD:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response?.status === 404) {
      throw new Error('Surat tugas tidak ditemukan');
    } else if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Format file tidak valid');
    } else if (error.response?.status === 413) {
      throw new Error('Ukuran file terlalu besar (maksimal 2MB)');
    }
    
    throw error;
  }
};

export const getTTD = async () => {
  try {
    console.log('Get TTD independent...');

    // Endpoint sekarang bisa me-redirect ke URL Google Drive.
    // Browser biasanya menyimpan URL final di responseURL.
    const response = await axios.get('/perjalanan/ttd-pegawai');
    const redirectedUrl = response?.request?.responseURL;

    if (redirectedUrl && /^https?:\/\//i.test(redirectedUrl)) {
      return redirectedUrl;
    }

    // Fallback jika backend nanti mengembalikan JSON.
    if (response?.data?.url && /^https?:\/\//i.test(response.data.url)) {
      return response.data.url;
    }

    return null;
  } catch (error) {
    console.error('Error get TTD:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response?.status === 404) {
      console.log('Tanda tangan belum diupload');
      return null;
    }
    
    throw error;
  }
};

export const uploadBuktiPembayaran = async (formData) => {
  try {
    const response = await axios.post('/perjalanan/bukti-pembayaran', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error upload bukti pembayaran:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const getBuktiPembayaran = async () => {
  try {
    const response = await axios.get('/perjalanan/bukti-pembayaran');
    return response.data?.bukti_pembayaran || [];
  } catch (error) {
    console.error('Error get bukti pembayaran:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

export const resetBuktiPembayaran = async () => {
  try {
    const response = await axios.delete('/perjalanan/bukti-pembayaran');
    return response.data;
  } catch (error) {
    console.error('Error reset bukti pembayaran:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};
