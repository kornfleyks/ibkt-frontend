import { createContext, useContext, useState } from "react";

const LayoutContext = createContext();

function LayoutProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const value = {
    sidebarOpen,
    setSidebarOpen,
  };

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

function useLayout() {
  return useContext(LayoutContext);
}

export { LayoutProvider, useLayout };
