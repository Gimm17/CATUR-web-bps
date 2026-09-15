import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
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
      <div role="status">
        <p>Belum ada laporan perjalanan yang dapat ditampilkan.</p>
      </div>
    );
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
