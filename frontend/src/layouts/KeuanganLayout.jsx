import { useEffect } from "react";
import Navbar from "../fragments/Navbar.keuangan.jsx";
import SidebarKeuangan from "../fragments/Sidebar.keuangan.jsx";

export default function KeuanganLayout({ children }) {
  // Handle sidebar toggle untuk mobile (ikut pola admin)
  useEffect(() => {
    const handleSidebarToggle = () => {
      const sidebar = document.querySelector(".sensus-sidebar");
      const overlay = document.querySelector(".sidebar-overlay");
      if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.toggle("mobile-open");
        if (overlay) overlay.classList.toggle("active");
      }
    };

    window.addEventListener("sidebarToggle", handleSidebarToggle);
    
    // Handle resize untuk reset sidebar
    const handleResize = () => {
      const sidebar = document.querySelector(".sensus-sidebar");
      const overlay = document.querySelector(".sidebar-overlay");
      if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove("mobile-open");
        if (overlay) overlay.classList.remove("active");
      }
    };

    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("sidebarToggle", handleSidebarToggle);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="wrapper">
      <Navbar />
      <SidebarKeuangan />
      
      {/* Overlay untuk mobile */}
      <div
        className="sidebar-overlay"
        onClick={() => {
          const sidebar = document.querySelector(".sensus-sidebar");
          const overlay = document.querySelector(".sidebar-overlay");
          if (sidebar) sidebar.classList.remove("mobile-open");
          if (overlay) overlay.classList.remove("active");
        }}
      ></div>

      <div className="content-wrapper p-3">
        {children}
      </div>
    </div>
  )
}
