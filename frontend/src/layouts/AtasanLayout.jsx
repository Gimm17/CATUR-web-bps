import { useSidebar } from "../contexts/SidebarContext";
import Navbar from "../fragments/navbar.atasan.jsx";
import Sidebar from "../fragments/sidebar.atasan.jsx";

export default function AtasanLayout({ children }) {
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
