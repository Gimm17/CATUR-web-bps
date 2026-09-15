import { useEffect } from "react"
import Navbar from "../fragments/Navbar.pegawai.jsx"
import Sidebar from "../fragments/Sidebar.pegawai.jsx"

export default function PegawaiLayout({ children }) {
  
  // Handle sidebar toggle untuk mobile
  useEffect(() => {
    const handleSidebarToggle = () => {
      const sidebar = document.querySelector('.sensus-sidebar');
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.toggle('mobile-show');
      }
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle);
    
    // Handle resize untuk reset sidebar
    const handleResize = () => {
      const sidebar = document.querySelector('.sensus-sidebar');
      if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove('mobile-show');
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('sidebarToggle', handleSidebarToggle);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      
      {/* Overlay untuk mobile */}
      <div className="sidebar-overlay" onClick={() => {
        const sidebar = document.querySelector('.sensus-sidebar');
        if (sidebar) {
          sidebar.classList.remove('mobile-show');
        }
      }}></div>

      <div className="content-wrapper p-3">
        {children}
      </div>
    </div>
  )
}