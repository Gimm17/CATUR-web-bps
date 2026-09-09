import { useEffect, useState } from 'react';
import { toPublicFileUrl } from '../../utils/fileUrl';
import { getSuratTugasAktif } from '../../services/suratTugas.service';

const SuratTugasPegawai = () => {
  const [surat, setSurat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuratTugasAktif()
      .then((res) => setSurat(res))
      .catch(() => setSurat(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center">Loading...</p>;

  if (!surat) return <p className="text-center">Anda tidak memiliki surat tugas aktif</p>;

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header">
          <h2>Surat Tugas Aktif</h2>
        </div>
        <div className="card-body">
          <p><strong>Nomor Surat:</strong> {surat.nomor_surat}</p>
          <p><strong>Tanggal:</strong> {surat.tanggal_mulai} s/d {surat.tanggal_selesai}</p>
          <p><strong>Status:</strong> {surat.status}</p>

          {surat.file_surat && (
            <a
              href={toPublicFileUrl(surat.file_surat)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-link"
            >
              Lihat File Surat
            </a>
          )}

          <hr />
          <button
            onClick={() => window.location.href = '/presensi'}
            className="btn btn-primary"
          >
            Presensi Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuratTugasPegawai;
