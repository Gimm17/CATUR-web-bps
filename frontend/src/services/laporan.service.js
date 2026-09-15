import axios from '../api/axios';

function requireSuratId(suratId) {
  const value = String(suratId ?? '').trim();
  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    throw new Error('suratId wajib diisi');
  }
  return value;
}

const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
};

export const getLaporanPerjalanan = async (suratId) => {
  const id = requireSuratId(suratId);
  const response = await axios.get(`/perjalanan/surat/${id}`);
  return response.data;
};

export const kirimLaporanAkhir = async (suratId, payload) => {
  const id = requireSuratId(suratId);
  const response = await axios.post(`/perjalanan/surat/${id}/kirim`, payload);
  return response.data;
};

export const uploadTTD = async (suratId, formData) => {
  const id = requireSuratId(suratId);
  try {
    const response = await axios.post(
      `/perjalanan/surat/${id}/ttd-pegawai`,
      formData,
      multipartConfig
    );
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) throw new Error('Surat tugas tidak ditemukan');
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Format file tidak valid');
    }
    if (error.response?.status === 413) {
      throw new Error('Ukuran file terlalu besar (maksimal 2MB)');
    }
    throw error;
  }
};

export const getTTD = async (suratId) => {
  const id = requireSuratId(suratId);
  try {
    const response = await axios.get(`/perjalanan/surat/${id}/ttd-pegawai`);
    const redirectedUrl = response?.request?.responseURL;
    if (redirectedUrl && /^https?:\/\//i.test(redirectedUrl)) return redirectedUrl;
    if (response?.data?.url && /^https?:\/\//i.test(response.data.url)) {
      return response.data.url;
    }
    return null;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const uploadBuktiPembayaran = async (suratId, formData) => {
  const id = requireSuratId(suratId);
  const response = await axios.post(
    `/perjalanan/surat/${id}/bukti-pembayaran`,
    formData,
    multipartConfig
  );
  return response.data;
};

export const getBuktiPembayaran = async (suratId) => {
  const id = requireSuratId(suratId);
  try {
    const response = await axios.get(`/perjalanan/surat/${id}/bukti-pembayaran`);
    return response.data?.bukti_pembayaran || [];
  } catch (error) {
    if (error.response?.status === 404) return [];
    throw error;
  }
};

export const resetBuktiPembayaran = async (suratId) => {
  const id = requireSuratId(suratId);
  const response = await axios.delete(`/perjalanan/surat/${id}/bukti-pembayaran`);
  return response.data;
};

export { requireSuratId };
