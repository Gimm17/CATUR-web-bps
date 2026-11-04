import { useSidebar } from "../contexts/SidebarContext";
import Navbar from "../fragments/Navbar.keuangan.jsx";
import SidebarKeuangan from "../fragments/Sidebar.keuangan.jsx";

export default function KeuanganLayout({ children }) {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  return (
    <div className="wrapper">
      <Navbar />
      <SidebarKeuangan />
      
      {/* Backdrop overlay untuk drawer mobile/tablet */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={closeMobileSidebar}
      />

      <div className="content-wrapper p-3">
        {children}
      </div>
    </div>
  );
}
