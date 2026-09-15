/* eslint-disable react-refresh/only-export-components */
// src/contexts/SidebarContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Cek localStorage untuk status sidebar
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
      return newState;
    });
  };

  const collapseSidebar = () => {
    setIsSidebarCollapsed(true);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(true));
  };

  const expandSidebar = () => {
    setIsSidebarCollapsed(false);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(false));
  };

  // Update body class untuk styling
  useEffect(() => {
    if (isSidebarCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isSidebarCollapsed]);

  return (
    <SidebarContext.Provider 
      value={{ 
        isSidebarCollapsed, 
        toggleSidebar, 
        collapseSidebar, 
        expandSidebar 
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};
