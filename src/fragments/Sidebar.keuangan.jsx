import { Link, useLocation } from "react-router-dom"
import { 
  FaTachometerAlt, 
  FaCalendarCheck, 
  FaFileAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaInfoCircle,
  FaHome,
  FaClipboardList,
  FaChartLine,
  FaUser
} from "react-icons/fa";
import { useState, useEffect } from "react";
import '../css/sidebar.css';

export default function Sidebar() {
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
              to="/dashboard" 
              className={`mobile-nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaTachometerAlt />
              </div>
              <span className="mobile-nav-label">Dashboard</span>
            </Link>

            <Link 
              to="/presensi" 
              className={`mobile-nav-item ${location.pathname === "/presensi" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaCalendarCheck />
              </div>
              <span className="mobile-nav-label">Presensi</span>
              <span className="mobile-nav-badge">NEW</span>
            </Link>

            <Link 
              to="/laporan" 
              className={`mobile-nav-item ${location.pathname === "/laporan" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaChartBar />
              </div>
              <span className="mobile-nav-label">Laporan</span>
            </Link>

            <Link 
              to="/laporan-report" 
              className={`mobile-nav-item ${location.pathname === "/laporan-report" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaClipboardList />
              </div>
              <span className="mobile-nav-label">Report</span>
            </Link>

            <Link 
              to="/informasi-aplikasi" 
              className={`mobile-nav-item ${location.pathname === "/informasi-aplikasi" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaInfoCircle />
              </div>
              <span className="mobile-nav-label">Info</span>
            </Link>

            <Link 
              to="/profil" 
              className={`mobile-nav-item ${location.pathname === "/profil" ? "active" : ""}`}
            >
              <div className="mobile-nav-icon">
                <FaUser />
              </div>
              <span className="mobile-nav-label">Profil</span>
            </Link>
          </div>
        </nav>

        {/* Tombol Logout Floating untuk Mobile */}
       
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
                src="img/logo.png" 
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
        <Link to="/dashboard" className="brand-link text-decoration-none">
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
 <li className="nav-item sensus-nav-item">
              <Link
                to="/dashboard-keuangan"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/dashboard-keuangan" ? "active" : ""
                }`}
              >
                <i className="nav-icon">
                  <FaTachometerAlt />
                </i>
                <p>Dashboard Keuangan</p>
              </Link>
            </li>

            <li className="nav-item sensus-nav-item">
              <Link
                to="/informasi-keuangan"
                className={`nav-link sensus-nav-link ${
                  location.pathname === "/informasi-keuangan" ? "active" : ""
                }`}
              >
                <i className="nav-icon">
                  <FaInfoCircle />
                </i>
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
            <small>© {currentYear} BPS - PROVINSI SULAWESI TENGAH</small>
          </div>
          <div className="sensus-watermark">
            <span>CATUR - Pelaporan Perjalanan Dinas</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
