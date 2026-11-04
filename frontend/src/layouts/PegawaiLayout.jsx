import { useSidebar } from "../contexts/SidebarContext";
import Navbar from "../fragments/Navbar.pegawai.jsx";
import Sidebar from "../fragments/Sidebar.pegawai.jsx";

export default function PegawaiLayout({ children }) {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  return (
    <div className="wrapper">
      <Navbar />
      <Sidebar />
      
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
