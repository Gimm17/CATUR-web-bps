import { useState, useEffect, useRef } from "react";
import { 
  FaUserCircle, 
  FaBell, 
  FaSearch, 
  FaExpand, 
  FaCog,
  FaSignOutAlt,
  FaUser,
  FaCalendarAlt,
  FaChartLine,
  FaSpinner,
  FaExclamationTriangle,
  FaEnvelope,
  FaCheckCircle,
  FaBars,
  FaTimes
} from "react-icons/fa";
import api from "../api/axios";
import { getProfil } from "../services/akun.service";
import '../css/navbar.css';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const searchRef = useRef(null);
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Fungsi untuk toggle sidebar
  const toggleSidebar = () => {
    const sidebar = document.querySelector('.sensus-sidebar');
    const contentWrapper = document.querySelector('.content-wrapper');
    
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      setIsSidebarCollapsed(!isSidebarCollapsed);
      
      // Update layout body jika diperlukan
      if (document.body.classList.contains('sidebar-collapse')) {
        document.body.classList.remove('sidebar-collapse');
        document.body.classList.add('sidebar-open');
      } else {
        document.body.classList.add('sidebar-collapse');
        document.body.classList.remove('sidebar-open');
      }
      
      // Simpan state di localStorage
      localStorage.setItem('sidebarCollapsed', !isSidebarCollapsed);
      
      // Dispatch event untuk komponen lain
      window.dispatchEvent(new Event('sidebarToggle'));
    }
    
    // Adjust content wrapper
    if (contentWrapper) {
      contentWrapper.classList.toggle('expanded');
    }
  };

  // Initialize sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
      setIsSidebarCollapsed(true);
      const sidebar = document.querySelector('.sensus-sidebar');
      const contentWrapper = document.querySelector('.content-wrapper');
      
      if (sidebar) {
        sidebar.classList.add('collapsed');
      }
      if (contentWrapper) {
        contentWrapper.classList.add('expanded');
      }
      document.body.classList.add('sidebar-collapse');
    }
  }, []);

  // Fetch user profile dari backend
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getProfil();
      
      if (response) {
        setUser(response);
        localStorage.setItem("user", JSON.stringify(response));
      } else {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Gagal memuat data pengguna");
      
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications dari backend
  const fetchNotifications = async () => {
    try {
      const response = await api.get("/notifikasi");
      
      if (response.data && Array.isArray(response.data)) {
        const normalized = response.data.map(notif => ({
          ...notif,
          dibaca: notif.dibaca ?? notif.is_read ?? false
        }));
        setNotifications(normalized);
        
        const unread = normalized.filter(notif => !notif.dibaca).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([
        {
          id: 1,
          judul: "Sistem CATUR-SENSUS",
          pesan: "Selamat datang di sistem presensi dinas",
          tipe: "sistem",
          dibaca: false,
          tanggal: new Date().toISOString()
        }
      ]);
      setUnreadCount(1);
    }
  };

  // Handle search
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await api.get(`/user/all?search=${encodeURIComponent(query)}`);
      
      if (response.data && Array.isArray(response.data)) {
        setSearchResults(response.data.slice(0, 5));
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Error searching:", err);
      setSearchResults([]);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifikasi/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, dibaca: true, is_read: true } 
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.put("/notifikasi/read-all");
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, dibaca: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Fullscreen toggle
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchUserProfile();
    fetchNotifications();
    
    const notificationInterval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(notificationInterval);
  }, []);

  // Handle search input change
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Format notification time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} menit lalu`;
    } else if (diffHours < 24) {
      return `${diffHours} jam lalu`;
    } else if (diffDays < 7) {
      return `${diffDays} hari lalu`;
    } else {
      return date.toLocaleDateString('id-ID');
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'presensi':
        return <FaCalendarAlt />;
      case 'laporan':
        return <FaChartLine />;
      case 'sistem':
        return <FaCog />;
      case 'surat_tugas':
        return <FaEnvelope />;
      default:
        return <FaBell />;
    }
  };

  return (
    <nav className="main-header navbar navbar-expand navbar-white navbar-light sensus-navbar">
      {/* Left Side - Menu Toggle & Search */}
      <ul className="navbar-nav">
        <li className="nav-item">
          <button
            className="nav-link btn sensus-menu-toggle"
            type="button"
            title="Toggle Sidebar"
            onClick={toggleSidebar}
          >
            {isSidebarCollapsed ? <FaBars /> : <FaTimes />}
          </button>
        </li>
        
        {/* Current Date Display */}
        <li className="nav-item date-display">
          <div className="nav-link">
            <FaCalendarAlt className="me-2" />
            <span>{currentDate}</span>
          </div>
        </li>

        {/* Search Bar dengan Results */}
        <li className="nav-item">
          <div className="sensus-search-container" ref={searchRef}>
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              className="sensus-search-input"
              placeholder="Cari pegawai, surat tugas, atau laporan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                <div className="search-results-header">
                  <strong>Hasil Pencarian</strong>
                  <small>{searchResults.length} hasil ditemukan</small>
                </div>
                <div className="search-results-list">
                  {searchResults.map((result) => (
                    <a 
                      key={result.id} 
                      href={`/pegawai/${result.id}`}
                      className="search-result-item"
                      onClick={() => setShowSearchResults(false)}
                    >
                      <div className="search-result-avatar">
                        <FaUserCircle />
                      </div>
                      <div className="search-result-info">
                        <strong>{result.nama}</strong>
                        <small>{result.role} • {result.email}</small>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </li>
      </ul>

      {/* Right Side - User & Actions */}
      <ul className="navbar-nav ms-auto">
        {/* Notifications Dropdown */}
        <li className="nav-item dropdown">
          <a
            className="nav-link btn notification-badge"
            href="#"
            id="notificationDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="badge-count">{unreadCount}</span>
            )}
            {loading && notifications.length === 0 && (
              <FaSpinner className="spinner-icon" />
            )}
          </a>
          
          <ul className="dropdown-menu dropdown-menu-end sensus-dropdown" aria-labelledby="notificationDropdown">
            <li className="dropdown-header">
              <strong>Notifikasi</strong>
              <div className="notification-actions">
                {unreadCount > 0 && (
                  <button 
                    className="btn-mark-all-read"
                    onClick={markAllAsRead}
                  >
                    Tandai semua sudah dibaca
                  </button>
                )}
                <span className="badge bg-primary">{unreadCount} baru</span>
              </div>
            </li>
            
            {error && notifications.length === 0 ? (
              <li className="dropdown-item text-center py-3">
                <FaExclamationTriangle className="text-warning mb-2" />
                <small className="text-muted">Gagal memuat notifikasi</small>
              </li>
            ) : notifications.length === 0 ? (
              <li className="dropdown-item text-center py-3">
                <FaBell className="text-muted mb-2" />
                <small className="text-muted">Tidak ada notifikasi</small>
              </li>
            ) : (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <div className="notifications-list">
                  {notifications.slice(0, 5).map((notification) => (
                    <li key={notification.id}>
                      <a 
                        className={`dropdown-item notification-item ${!notification.dibaca ? 'unread' : ''}`}
                        href="#"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="notification-icon">
                          {getNotificationIcon(notification.tipe)}
                        </div>
                        <div className="notification-content">
                          <strong>{notification.judul}</strong>
                          <small>{notification.pesan}</small>
                          <div className="notification-time">
                            {formatTime(notification.tanggal)}
                            {!notification.dibaca && <span className="unread-dot"></span>}
                          </div>
                        </div>
                        {notification.dibaca && (
                          <FaCheckCircle className="notification-read-icon" />
                        )}
                      </a>
                    </li>
                  ))}
                </div>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <a className="dropdown-item text-center" href="/notifikasi">
                    Lihat semua notifikasi ({notifications.length})
                  </a>
                </li>
              </>
            )}
          </ul>
        </li>

        {/* Fullscreen Toggle */}
        <li className="nav-item">
          <button 
            className="nav-link btn sensus-fullscreen"
            onClick={handleFullscreen}
            title="Fullscreen"
          >
            <FaExpand />
          </button>
        </li>

        {/* User Profile Dropdown */}
        <li className="nav-item dropdown">
          <a
            className="nav-link btn dropdown-toggle sensus-profile"
            href="#"
            id="navbarDropdown"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {loading ? (
              <div className="d-flex align-items-center gap-2">
                <FaSpinner className="spinner" />
                <span>Memuat...</span>
              </div>
            ) : user ? (
              <>
                <div className="user-avatar-nav">
                  <FaUserCircle className="avatar-placeholder" />
                </div>
                <div className="user-info-nav">
                  <span className="user-name-nav">{user.nama || 'Pengguna'}</span>
                  <span className="user-role-nav">
                    {user.role === 'admin' ? 'Administrator' : 
                     user.role === 'atasan' ? 'Atasan' : 
                     user.role === 'keuangan' ? 'Keuangan' : 
                     'Pegawai'}
                  </span>
                </div>
              </>
            ) : (
              <div className="user-info-nav">
                <span className="user-name-nav">Pengguna</span>
                <span className="user-role-nav">Belum login</span>
              </div>
            )}
          </a>
          
          <ul className="dropdown-menu dropdown-menu-end sensus-dropdown" aria-labelledby="navbarDropdown">
            {loading ? (
              <li className="dropdown-item text-center py-3">
                <FaSpinner className="spinner" />
                <small className="text-muted">Memuat data...</small>
              </li>
            ) : user ? (
              <>
                <li className="dropdown-header">
                  <strong>Akun Pengguna</strong>
                  <small>{user.email || 'user@example.com'}</small>
                  <div className="user-role-badge-nav">
                    <span className={`badge ${user.role}`}>
                      {user.role === 'admin' ? 'Administrator' : 
                       user.role === 'atasan' ? 'Atasan' : 
                       user.role === 'keuangan' ? 'Keuangan' : 
                       'Pegawai'}
                    </span>
                  </div>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <a className="dropdown-item" href="/profil">
                    <FaUser className="me-2" />
                    Profil Saya
                  </a>
                </li>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <button
                    className="dropdown-item text-danger"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="me-2" />
                    Keluar Sistem
                  </button>
                </li>
              </>
            ) : (
              <li className="dropdown-item text-center py-3">
                <FaExclamationTriangle className="text-warning mb-2" />
                <small className="text-muted">Silakan login terlebih dahulu</small>
                <div className="mt-2">
                  <a href="/login" className="btn btn-sm btn-primary">
                    Login
                  </a>
                </div>
              </li>
            )}
          </ul>
        </li>
      </ul>
    </nav>
  );
}
