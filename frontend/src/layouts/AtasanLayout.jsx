import { useState, useEffect } from "react";
import Navbar from "../fragments/navbar.atasan.jsx";
import Sidebar from "../fragments/sidebar.atasan.jsx";

export default function AtasanLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking overlay
  const closeSidebar = () => {
    const sidebar = document.querySelector('.sensus-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
  };

  return (
    <div className="wrapper">
      {/* Mobile Overlay */}
      {isMobile && (
        <div 
          className="sidebar-overlay"
          onClick={closeSidebar}
        />
      )}

      <Navbar />
      <Sidebar />
      
      <div className="content-wrapper p-3">
        {children}
      </div>
    </div>
  );
}
