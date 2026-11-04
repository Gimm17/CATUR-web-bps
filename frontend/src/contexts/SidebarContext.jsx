/* eslint-disable react-refresh/only-export-components */
// src/contexts/SidebarContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Toggle behavior:
  // - on screens < 992px (tablets & phones): toggle slide-over drawer
  // - on screens >= 992px (desktop): toggle mini collapsed sidebar
  const toggleSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('sidebarCollapsed', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const openMobileSidebar = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const collapseSidebar = useCallback(() => {
    setIsSidebarCollapsed(true);
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(true));
    } catch {}
  }, []);

  const expandSidebar = useCallback(() => {
    setIsSidebarCollapsed(false);
    try {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(false));
    } catch {}
  }, []);

  // Sync classes to document.body for AdminLTE and responsive styling
  useEffect(() => {
    if (isSidebarCollapsed) {
      document.body.classList.add('sidebar-collapse');
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapse');
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
  }, [isMobileOpen]);

  // Close mobile drawer on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider
      value={{
        isSidebarCollapsed,
        isMobileOpen,
        toggleSidebar,
        closeMobileSidebar,
        openMobileSidebar,
        collapseSidebar,
        expandSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      isSidebarCollapsed: false,
      isMobileOpen: false,
      toggleSidebar: () => {},
      closeMobileSidebar: () => {},
      openMobileSidebar: () => {},
      collapseSidebar: () => {},
      expandSidebar: () => {},
    };
  }
  return context;
};
