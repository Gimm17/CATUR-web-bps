import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import PegawaiLayout from '../../layouts/PegawaiLayout';
import { getSuratTugasLaporanDefault } from '../../services/surat.service';

export default function LaporanEntry() {
  const [state, setState] = useState({ status: 'loading', suratId: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let activeRequest = true;
    getSuratTugasLaporanDefault()
      .then((assignment) => {
        if (!activeRequest) return;
        setState(assignment?.id
          ? { status: 'report', suratId: assignment.id }
          : { status: 'empty', suratId: null });
      })
      .catch((error) => {
        if (!activeRequest) return;
        console.error('Gagal menentukan surat laporan default:', error);
        setState({ status: 'error', suratId: null });
      });
    return () => { activeRequest = false; };
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading', suratId: null });
    setAttempt((value) => value + 1);
  };

  if (state.status === 'report') {
    return <Navigate to={`/laporan/${state.suratId}`} replace />;
  }
  if (state.status === 'empty') {
    return (
      <PegawaiLayout>
        <section className="container-fluid py-4" role="status">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <p className="mb-0">Belum ada laporan perjalanan yang dapat ditampilkan.</p>
            </div>
          </div>
        </section>
      </PegawaiLayout>
    );
  }
  if (state.status === 'error') {
    return (
      <PegawaiLayout>
        <section className="container-fluid py-4">
          <div className="card border-0 shadow-sm" role="alert">
            <div className="card-body text-center py-5">
              <FaExclamationTriangle className="text-warning fs-2 mb-3" aria-hidden="true" />
              <p>Gagal memeriksa surat tugas aktif.</p>
              <button type="button" className="btn btn-primary" onClick={retry}>Coba lagi</button>
            </div>
          </div>
        </section>
      </PegawaiLayout>
    );
  }
  return (
    <PegawaiLayout>
      <section className="container-fluid py-4" role="status" aria-live="polite">
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <FaSpinner className="fa-spin text-primary fs-2 mb-3" aria-hidden="true" />
            <h2 className="h5 mb-2">Menyiapkan laporan perjalanan</h2>
            <p className="text-muted mb-0">Memilih surat tugas yang sesuai. Mohon tunggu sebentar.</p>
          </div>
        </div>
      </section>
    </PegawaiLayout>
  );
}
