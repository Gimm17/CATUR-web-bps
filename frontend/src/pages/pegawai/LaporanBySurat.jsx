import { Navigate, useParams } from 'react-router-dom';

export default function LaporanBySurat() {
  const { id } = useParams();
  return <Navigate to={id ? `/laporan/${id}` : '/laporan-report'} replace />;
}
