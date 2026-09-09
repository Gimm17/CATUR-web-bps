import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './auth/login';
import Dashboard from './pages/pegawai/Dashboard';
import SuratTugas from './pages/pegawai/SuratTugasPegawai';
import Presensi from './pages/pegawai/PresensiPegawai';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminDaerah from "./pages/admin/AdminDaerah";
import SuratTugasCreate from './pages/admin/suratTugasCreate';
import Profile from './pages/pegawai/profile';
import DashboardAdmin from './pages/admin/DashboardAdmin'
import PengaturanAkun from './pages/admin/PengaturanAkun';
import PetaSulteng from './pages/admin/PetaSulteng';
import LaporanPegawai from './pages/pegawai/LaporanPegawai';
import DashboardAtasan from './pages/atasan/DashboardAtasan';
import ProgresPegawai from './pages/atasan/LaporanAtasan';
import DashboardKeuangan from './pages/keuangan/dashboardKeuangan';
import InformasiAplikasi from './pages/pegawai/informasi';
import Informasicatur from './pages/admin/informasi';
import Informasiatasan from './pages/atasan/informasi';
import ReportSurat from './pages/pegawai/LaporanBySurat';
import ReportLaporanPegawai from './pages/pegawai/ReportLaporanPegawai';
import InformasiKeuangan from './pages/keuangan/informasi';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard-admin" element={<ProtectedRoute allowedRoles={["admin"]}>
              <DashboardAdmin />
            </ProtectedRoute>} />
        <Route path="/progres-pegawai" element={<ProtectedRoute allowedRoles={["atasan"]}>
              <ProgresPegawai />
            </ProtectedRoute>} />
            <Route path="/dashboard-atasan" element={<ProtectedRoute allowedRoles={["atasan"]}>
              <DashboardAtasan />
            </ProtectedRoute>} />
             <Route path="/dashboard-keuangan" element={<ProtectedRoute allowedRoles={["keuangan"]}>
              <DashboardKeuangan />
            </ProtectedRoute>} />
        <Route path="/laporan-surat" element={<ReportSurat />} />
        <Route path="/informasi-keuangan" element={<InformasiKeuangan />} />
        <Route path="/informasi-aplikasi" element={<InformasiAplikasi />} />
        <Route path="/informasi-catur" element={<Informasicatur />} />
        <Route path="/informasi-atasan" element={<Informasiatasan />} />
        <Route path="/surat-tugas" element={<SuratTugas />} />
        <Route path="/presensi" element={<Presensi />} />
        <Route path="/laporan" element={<LaporanPegawai />} />
        <Route path="/laporan-report" element={<ReportLaporanPegawai />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/admin-daerah" element={<AdminDaerah/>} />
        <Route path="/pengaturan-akun" element={<PengaturanAkun/>} />
        <Route path="/admin/peta-sulteng" element={<PetaSulteng />} />
        <Route path="/admin/surat-tugas/create" element={<SuratTugasCreate />}/>
        <Route path="/dashboard" element={<Dashboard />}/>
      </Routes>
    </BrowserRouter>
  );
}
