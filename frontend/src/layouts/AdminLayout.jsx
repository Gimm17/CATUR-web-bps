import { useSidebar } from '../contexts/SidebarContext';
import Sidebar from '../fragments/Sidebar';
import Navbar from '../fragments/Navbar';

export default function AdminLayout({ children }) {
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

      <div className="content-wrapper">
        {children}
      </div>
    </div>
  );
}
