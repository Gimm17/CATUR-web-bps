// AdminLayout.jsx
import { useEffect } from 'react';
import { SidebarProvider } from '../contexts/SidebarContext'; // Import SidebarProvider
import Sidebar from '../fragments/Sidebar';
import Navbar from '../fragments/Navbar';

export default function AdminLayout({ children }) {
  return (
    // Wrap seluruh layout dengan SidebarProvider
    <SidebarProvider>
      <AdminLayoutBody>{children}</AdminLayoutBody>
    </SidebarProvider>
  );
}

function AdminLayoutBody({ children }) {
  // Handle sidebar toggle untuk mobile (mirip layout pegawai)
  useEffect(() => {
    const handleSidebarToggle = () => {
      const sidebar = document.querySelector('.sensus-sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.toggle('mobile-open');
        if (overlay) {
          overlay.classList.toggle('active');
        }
      }
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle);

    const handleResize = () => {
      const sidebar = document.querySelector('.sensus-sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove('mobile-open');
        if (overlay) {
          overlay.classList.remove('active');
        }
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
      <div
        className="sidebar-overlay"
        onClick={() => {
          const sidebar = document.querySelector('.sensus-sidebar');
          const overlay = document.querySelector('.sidebar-overlay');
          if (sidebar) {
            sidebar.classList.remove('mobile-open');
          }
          if (overlay) {
            overlay.classList.remove('active');
          }
        }}
      ></div>

      <div className="content-wrapper">
        {children}
      </div>
    </div>
  );
}
