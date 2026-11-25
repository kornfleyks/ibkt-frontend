import { NavLink } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import { useLayout } from "../../context/LayoutContext";
import useAuth from "../../hooks/useAuth";

import { getAccessibleNavItems } from "../../utils/navigationAccess";

import SidebarFooter from "../SidebarFooter/SidebarFooter";
import MondayUsageCounter from "../Common/MondayUsageCounter";
import DatabaseUsageCounter from "../Common/DatabaseUsageCounter";

function Sidebar() {
  const theme = useTheme();

  const { sidebarOpen, setSidebarOpen } = useLayout();

  const { user, isSuperAdmin } = useAuth();

  function handleNavigation() {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  const visibleItems = getAccessibleNavItems(user);
  // Request counters (Monday API, database), for Super Admins - every
  // environment, not just development.
  const showMondayUsage = isSuperAdmin;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* The Oriel logo is in the header, so the sidebar starts with the menu. */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginTop: "30px",
        }}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavigation}
              style={({ isActive }) => ({
                color: "inherit",
                textDecoration: "none",
                padding: "10px",
                borderRadius: theme.shape.borderRadius,
                // Vibe selected state: selected fill, with primary-blue text
                // in light mode (in dark, blue on the dark-blue fill is
                // unreadable, so the text stays the normal colour).
                background: isActive ? theme.palette.action.selected : "transparent",
                ...(isActive && theme.palette.mode === "light" && { color: theme.palette.primary.main }),
                display: "flex",
                alignItems: "center",
                gap: sidebarOpen ? "12px" : "0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
              })}
            >
              <Icon />
              {sidebarOpen && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>
      {showMondayUsage && (
        <>
          <MondayUsageCounter collapsed={!sidebarOpen} />
          <DatabaseUsageCounter collapsed={!sidebarOpen} />
        </>
      )}
      <SidebarFooter />
    </div>
  );
}

export default Sidebar;
