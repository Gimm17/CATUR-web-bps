import React from 'react';
import { 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaClock, 
  FaMobileAlt,
  FaShieldAlt,
  FaSync,
  FaInfoCircle,
  FaDatabase,
  FaQrcode,
  FaHistory
} from 'react-icons/fa';
import { 
  FiDownload, 
  FiBookOpen, 
  FiHelpCircle, 
  FiMail,
  FiPhone,
  FiMapPin
} from 'react-icons/fi';
import '../../css/informasi.css'; // CSS khusus untuk halaman ini
import AdminLayout from '../../layouts/AdminLayout';

export default function InformasiAplikasi() {
  // Informasi versi aplikasi
  const appInfo = {
    nama: 'CATUR (Control Activity Time Use Record)',
    versi: 'v1.1.0',
    rilis: 'Januari 2026',
    developer: 'IPDS',
    platform: 'Web Progressive App (PWA)',
  };

  // Fitur utama aplikasi
  const features = [
    {
      icon: <FaCalendarAlt />,
      title: 'Presensi Real-time',
      desc: 'Presensi dengan timestamp dan lokasi akurat selama perjalanan dinas'
    },
    {
      icon: <FaMapMarkerAlt />,
      title: 'Geolocation Tracking',
      desc: 'Pencatatan koordinat GPS untuk setiap aktivitas di lapangan'
    },
    {
      icon: <FaClock />,
      title: 'Time Management',
      desc: 'Pengelolaan waktu kerja dan laporan produktivitas harian'
    },
    {
      icon: <FaMobileAlt />,
      title: 'Mobile Friendly',
      desc: 'Akses optimal melalui smartphone dan tablet di lapangan'
    },

  ];

  // Spesifikasi teknis
  

  // Tim pengembang

  return (
    <AdminLayout>
    <div className="informasi-app-container">
      {/* Header dengan judul */}
      <div className="app-header">
        <div className="app-header-content">
          <div className="app-icon-large">
            <FaInfoCircle />
          </div>
          <h1 className="app-title">Informasi Aplikasi</h1>
          <p className="app-subtitle">CATUR - Sistem Pelaporan Perjalanan Dinas</p>
        </div>
        <div className="app-version-badge">
          <span>{appInfo.versi}</span>
        </div>
      </div>

      {/* Kartu informasi utama */}
      <div className="app-info-card">
        <div className="app-info-header">
          <h2><FaInfoCircle /> Tentang CATUR</h2>
          <span className="app-badge official">APLIKASI RESMI BPS</span>
        </div>
        
        <div className="app-info-content">
          <div className="app-description">
            <p>
              <strong>CATUR (Control Activity Time Use Record)</strong> adalah sistem digital 
              inovatif yang dirancang khusus untuk memantau dan mencatat aktivitas 
              petugas selama pelaksanaan perjalanan dinas. Aplikasi ini menjadi 
              solusi modern dalam pengelolaan presensi lapangan dengan akurasi tinggi.
            </p>
            
            <div className="app-purpose">
              <h4><FaDatabase /> Tujuan Pengembangan:</h4>
              <ul>
                <li>Digitalisasi sistem pelaporan perjalanan dinas</li>
                <li>Peningkatan akurasi pencatatan waktu kerja lapangan</li>
                <li>Penguatan akuntabilitas kinerja pegawai</li>
                <li>Integrasi data real-time </li>
              </ul>
            </div>
          </div>

          {/* Info teknis */}
          <div className="app-specs-grid">
            <div className="spec-item">
              <span className="spec-label">Nama Aplikasi</span>
              <span className="spec-value">{appInfo.nama}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Versi</span>
              <span className="spec-value">{appInfo.versi}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Tanggal Rilis</span>
              <span className="spec-value">{appInfo.rilis}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Pengembang</span>
              <span className="spec-value">{appInfo.developer}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Platform</span>
              <span className="spec-value">{appInfo.platform}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">Status</span>
              <span className="spec-value badge-active">Aktif & Termaintain</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fitur utama */}
      <div className="features-section">
        <h3><FaQrcode /> Fitur Utama CATUR</h3>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h4>{feature.title}</h4>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spesifikasi teknis */}
      
      {/* Tim pengembangan */}
     

      {/* Dokumentasi & bantuan */}
      <div className="docs-section">
        <h3><FiBookOpen /> Dokumentasi & Dukungan</h3>
        <div className="docs-actions">
          <button className="doc-btn">
            <FiDownload /> Panduan Pengguna
          </button>
          <button className="doc-btn">
            <FiHelpCircle /> FAQ & Bantuan
          </button>
          <button className="doc-btn">
            <FiBookOpen /> Manual Teknis
          </button>
        </div>
        
        <div className="support-contact">
          <h4><FiMail /> Kontak Dukungan</h4>
          <div className="contact-info">
            <div className="contact-item">
              <FiPhone /> Telp: (62-451) 483610, 483611, 483613.
            </div>
            <div className="contact-item">
              <FiMail /> Email: bps7200@bps.go.id
            </div>
            <div className="contact-item">
              <FiMapPin /> Kantor: Badan Pusat Statistik Provinsi Sulawesi Tengah. Jl. Prof. Mohammad Yamin No.48 Palu 94114.
            </div>
          </div>
        </div>
      </div>

      {/* Footer informasi */}
      <div className="app-footer-info">
        <div className="disclaimer">
          <p>
            <strong>CATUR</strong> dikembangkan oleh Badan Pusat Statistik untuk 
            mendukung pelaksanaan sensus dan survei nasional. 
            Hak cipta dilindungi undang-undang.
          </p>
        </div>
        <div className="copyright">
          © {new Date().getFullYear()} BPS - CATUR System. All rights reserved.
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
