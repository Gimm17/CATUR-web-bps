import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSuratTugasAktif } from '../../services/surat.service';

export default function LaporanEntry() {
  const [state, setState] = useState({ status: 'loading', suratId: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let activeRequest = true;
    getSuratTugasAktif()
      .then((active) => {
        if (!activeRequest) return;
        setState(active?.id
          ? { status: 'active', suratId: active.id }
          : { status: 'history', suratId: null });
      })
      .catch((error) => {
        if (!activeRequest) return;
        setState(error.response?.status === 404
          ? { status: 'history', suratId: null }
          : { status: 'error', suratId: null });
      });
    return () => { activeRequest = false; };
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading', suratId: null });
    setAttempt((value) => value + 1);
  };

  if (state.status === 'active') {
    return <Navigate to={`/laporan/${state.suratId}`} replace />;
  }
  if (state.status === 'history') {
    return <Navigate to="/laporan-report" replace />;
  }
  if (state.status === 'error') {
    return (
      <div role="alert">
        <p>Gagal memeriksa surat tugas aktif.</p>
        <button type="button" onClick={retry}>Coba lagi</button>
      </div>
    );
  }
  return <p role="status">Memeriksa surat tugas aktif...</p>;
}
