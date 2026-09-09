import { Link, useLocation } from "react-router-dom"
import { 
  FaTachometerAlt, 
  FaFileAlt,
  FaMapMarkerAlt,
  FaMap,
  FaUsers,
  FaSignOutAlt,
  FaInfoCircle,
  FaUser,
  FaChartBar
} from "react-icons/fa";
import { useState, useEffect } from "react";
import '../css/sidebar.css';

export default function SidebarAdmin() {
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Jika mobile, render bottom navigation
  if (isMobile) {
    return (
      <>
        {/* Bottom Navigation Bar untuk Mobile */}
        <nav className="mobile-bottom-nav">
          <div className="mobile-nav-container">
            <Link 
              to="/dashboard-admin" 
              className={`mobile-nav-item ${location.pathname === "/dashboard-admin" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaTachometerAlt />
              </div>
              <span className="mobile-nav-label">Dashboard</span>
            </Link>

            <Link 
              to="/admin/surat-tugas/create" 
              className={`mobile-nav-item ${location.pathname === "/admin/surat-tugas/create" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaFileAlt />
              </div>
              <span className="mobile-nav-label">Buat ST</span>
              <span className="mobile-nav-badge">NEW</span>
            </Link>

            <Link 
              to="/admin-daerah" 
              className={`mobile-nav-item ${location.pathname === "/admin-daerah" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaMapMarkerAlt />
              </div>
              <span className="mobile-nav-label">Daerah</span>
            </Link>

            <Link 
              to="/admin/peta-sulteng" 
              className={`mobile-nav-item ${location.pathname === "/admin/peta-sulteng" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaMap />
              </div>
              <span className="mobile-nav-label">Peta</span>
            </Link>

            <Link 
              to="/pengaturan-akun" 
              className={`mobile-nav-item ${location.pathname === "/pengaturan-akun" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaUsers />
              </div>
              <span className="mobile-nav-label">Akun</span>
            </Link>

            <Link 
              to="/informasi-catur" 
              className={`mobile-nav-item ${location.pathname === "/informasi-catur" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaInfoCircle />
              </div>
              <span className="mobile-nav-label">Info</span>
            </Link>
          </div>
        </nav>

        {/* Tombol Logout Floating untuk Mobile */}
        <button 
          className="mobile-logout-btn" 
          onClick={handleLogout}
          title="Keluar Sistem"
        >
          <FaSignOutAlt />
        </button>
      </>
    );
  }

  // Jika desktop, render sidebar normal
  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4 sensus-sidebar">
      {/* Brand dengan logo BPS */}
     <div className="sensus-brand">
        <div className="brand-logo-container">
          <div className="sensus-logo">
            <div className="bps-logo">
              <img 
                src="/img/logo.png" 
                alt="Logo BPS" 
                className="bps-logo-img"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="bps-logo-fallback">
                <span>BPS</span>
              </div>
            </div>
            <div className="logo-text">
              <h3 className="brand-title">CATUR</h3>
              <span className="brand-subtitle">Control Activity And Time Use Record</span>
            </div>
          </div>
          
        </div>
        <Link to="/dashboard-admin" className="brand-link text-decoration-none">
          <div className="brand-text-container">
            <span className="brand-text fw-bold sensus-brand-text">
              BADAN PUSAT STATISTIK
            </span>
            <span className="brand-text fw-bold sensus-brand-text">
              PROVINSI SULAWESI TENGAH
            </span>
            <small className="brand-slogan">Mudah, Transparan dan Berkah</small>
          </div>
        </Link>
      </div>

      {/* Sidebar Navigation */}
      <div className="sidebar">
        <nav className="mt-3">
          <ul
            className="nav nav-pills nav-sidebar flex-column sensus-nav"
            data-lte-toggle="treeview"
            role="menu"
          >
            {/* Dashboard Admin */}
            <li className="nav-item sensus-nav-item">
              <Link
                to="/dashboard-admin"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/dashboard-admin" ? "active" : ""
                }`}
              >
                <i className="nav-icon"><FaTachometerAlt /></i>
                <p>Dashboard Admin</p>
              </Link>
            </li>

            {/* Buat Surat Tugas */}
            <li className="nav-item sensus-nav-item">
              <Link
                to="/admin/surat-tugas/create"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/admin/surat-tugas/create" ? "active" : ""
                }`}
              >
                <i className="nav-icon"><FaFileAlt /></i>
                <p>Buat Surat Tugas</p>
                <span className="new-badge">NEW</span>
              </Link>
            </li>

            {/* Kelola Daerah Presensi */}
            <li className="nav-item sensus-nav-item">
              <Link
                to="/admin-daerah"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/admin-daerah" ? "active" : ""
                }`}
              >
                <i className="nav-icon"><FaMapMarkerAlt /></i>
                <p>Kelola Daerah Presensi</p>
                <span className="sensus-badge">NEW</span>
              </Link>
            </li>

            <li className="nav-item sensus-nav-item">
              <Link
                to="/admin/peta-sulteng"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/admin/peta-sulteng" ? "active" : ""
                }`}
              >
                <i className="nav-icon"><FaMap /></i>
                <p>Peta Sulawesi Tengah</p>
              </Link>
            </li>

            {/* Manajemen Akun */}
            <li className="nav-item sensus-nav-item">
              <Link
                to="/pengaturan-akun"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/pengaturan-akun" ? "active" : ""
                }`}
              >
                <i className="nav-icon"><FaUsers /></i>
                <p>Manajemen Akun</p>
              </Link>
            </li>

            {/* Informasi Aplikasi */}
            <li className="nav-item sensus-nav-item">
              <Link
                to="/informasi-catur"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/informasi-catur" ? "active" : ""
                }`}
              >
                <i className="nav-icon"><FaInfoCircle /></i>
                <p>Informasi Aplikasi</p>
              </Link>
            </li>

            {/* Divider */}
            <li className="nav-divider">
              <hr className="sensus-divider" />
            </li>

            {/* Logout */}
            <li className="nav-item sensus-nav-item">
              <Link
                to="/logout"
                className="nav-link sensus-nav-link logout-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
              >
                <i className="nav-icon"><FaSignOutAlt /></i>
                <p>Keluar Sistem</p>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Footer Sidebar */}
        <div className="sidebar-footer sensus-footer">
          <div className="sensus-tagline">
            <p className="mb-1">"Presensi Akurat, Data Berkualitas"</p>
            <small>© {currentYear} BPS PROVINSI SULAWESI TENGAH</small>
          </div>
          <div className="sensus-watermark">
            <span>CATUR - PELAPORAN PERJALANAN DINAS</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
