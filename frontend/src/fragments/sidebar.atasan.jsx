import { Link, useLocation } from "react-router-dom";
import { 
  FaTachometerAlt, 
  FaFileSignature,
  FaSignOutAlt,
  FaInfoCircle,
  FaUser,
  FaChartBar,
  FaTimes
} from "react-icons/fa";
import { useState, useEffect } from "react";
import { useSidebar } from "../contexts/SidebarContext";
import '../css/sidebar.css';

export default function SidebarAtasan() {
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const { isSidebarCollapsed, isMobileOpen, closeMobileSidebar } = useSidebar();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle logout
  const handleLogout = () => {
    closeMobileSidebar();
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <>
      {/* Sidebar Panel / Off-Canvas Drawer */}
      <aside
        className={`main-sidebar sidebar-dark-primary elevation-4 sensus-sidebar ${
          isSidebarCollapsed ? 'collapsed' : ''
        } ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand dengan logo BPS */}
        <div className="sensus-brand">
          {/* Tombol close drawer untuk layar tablet/mobile */}
          <button
            type="button"
            className="sensus-sidebar-close-btn"
            onClick={closeMobileSidebar}
            aria-label="Tutup Menu"
            title="Tutup Menu"
          >
            <FaTimes />
          </button>

          <div className="brand-logo-container">
            <div className="sensus-logo">
              <div className="bps-logo">
                <img 
                  src="/img/logo.png" 
                  alt="Logo BPS" 
                  className="bps-logo-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextElementSibling) {
                      e.target.nextElementSibling.style.display = 'flex';
                    }
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
          <Link
            to="/dashboard-atasan"
            className="brand-link text-decoration-none"
            onClick={closeMobileSidebar}
          >
            <div className="brand-text-container">
              <span className="brand-text fw-bold sensus-brand-text">
                BADAN PUSAT STATISTIK
              </span>
              <span className="brand-text fw-bold sensus-brand-text">
                PROVINSI SULAWESI TENGAH
              </span>
              <small className="brand-slogan">Mudah, Transparan Dan Berkah</small>
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
              {/* Dashboard Atasan */}
              <li className="nav-item sensus-nav-item">
                <Link
                  to="/dashboard-atasan"
                  className={`nav-link sensus-nav-link ${
                    location.pathname === "/dashboard-atasan" ? "active" : ""
                  }`}
                  onClick={closeMobileSidebar}
                >
                  <i className="nav-icon"><FaTachometerAlt /></i>
                  <p>Dashboard Atasan</p>
                </Link>
              </li>

              {/* Tanda Tangan Laporan */}
              <li className="nav-item sensus-nav-item">
                <Link
                  to="/progres-pegawai"
                  className={`nav-link sensus-nav-link ${
                    location.pathname === "/progres-pegawai" ? "active" : ""
                  }`}
                  onClick={closeMobileSidebar}
                >
                  <i className="nav-icon"><FaFileSignature /></i>
                  <p>Tanda Tangan Laporan</p>
                  <span className="new-badge">NEW</span>
                </Link>
              </li>

              {/* Informasi Aplikasi */}
              <li className="nav-item sensus-nav-item">
                <Link
                  to="/informasi-atasan"
                  className={`nav-link sensus-nav-link ${
                    location.pathname === "/informasi-atasan" ? "active" : ""
                  }`}
                  onClick={closeMobileSidebar}
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
              <span>CATUR - Pelaporan Perjalanan Dinas</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Bar untuk Mobile Phone (<= 768px) */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <div className="mobile-nav-container">
            <Link 
              to="/dashboard-atasan" 
              className={`mobile-nav-item ${location.pathname === "/dashboard-atasan" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaTachometerAlt />
              </div>
              <span className="mobile-nav-label">Dashboard</span>
            </Link>

            <Link 
              to="/progres-pegawai" 
              className={`mobile-nav-item ${location.pathname === "/progres-pegawai" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaFileSignature />
              </div>
              <span className="mobile-nav-label">TTD</span>
              <span className="mobile-nav-badge">NEW</span>
            </Link>

            <Link 
              to="/informasi-atasan" 
              className={`mobile-nav-item ${location.pathname === "/informasi-atasan" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaInfoCircle />
              </div>
              <span className="mobile-nav-label">Info</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
