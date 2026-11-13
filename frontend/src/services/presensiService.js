import axios from '../api/axios';

export const submitPresensi = async (formData) => {
  return axios.post('/presensi/absen', formData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const submitLaporan = async (presensiIdOrPayload, laporanArg) => {
  const isObjectPayload =
    presensiIdOrPayload !== null &&
    typeof presensiIdOrPayload === 'object';

  const presensiId = isObjectPayload
    ? (presensiIdOrPayload.presensi_id ?? presensiIdOrPayload.presensiId ?? presensiIdOrPayload.id)
    : presensiIdOrPayload;

  const laporan = isObjectPayload
    ? presensiIdOrPayload.laporan
    : laporanArg;

  const body = isObjectPayload
    ? {
        laporan,
        ...(presensiId ? { presensi_id: presensiId } : {}),
        ...(presensiIdOrPayload.surat_tugas_id ? { surat_tugas_id: presensiIdOrPayload.surat_tugas_id } : {}),
      }
    : { laporan };

  const endpoint = presensiId
    ? `/presensi/${presensiId}/laporan`
    : '/presensi/laporan';

  return axios.put(endpoint, body, {
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

export const getPresensiKendalaFotoAdmin = async (includeUnlocked = false) => {
  return axios.get('/presensi/admin/kendala-foto', {
    params: includeUnlocked ? { include_unlocked: 'true' } : {},
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
};

export const forceUnlockPresensiFotoAdmin = async (presensiId, payload = { force: true }) => {
  return axios.put(`/presensi/admin/${presensiId}/force-foto`, payload, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
  });
};
