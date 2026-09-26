import { NavLink } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import { useLayout } from "../../context/LayoutContext";
import useAuth from "../../hooks/useAuth";

import { getAccessibleNavItems } from "../../utils/navigationAccess";

import SidebarFooter from "../SidebarFooter/SidebarFooter";
import MondayUsageCounter from "../Common/MondayUsageCounter";
import { ROLES } from "../../constants/roles";

function Sidebar() {
  const theme = useTheme();

  const { sidebarOpen, setSidebarOpen } = useLayout();

  const { user } = useAuth();

  function handleNavigation() {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  const visibleItems = getAccessibleNavItems(user);
  // Development-only Monday API call counter, for Admins.
  const showMondayUsage = import.meta.env.APP_ENV === "development" && user?.role === ROLES.ADMIN;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {sidebarOpen ? (
        <Typography
          variant="h5"
          component="h2"
          sx={{ textAlign: "center", mb: 4, color: "inherit" }}
        >
          IBKT
        </Typography>
      ) : (
        <Box
          component="h2"
          sx={{
            display: "flex",
            justifyContent: "center",
            m: 0,
            mb: 4,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "primary.main",
            }}
          >
            <Typography
              sx={{
                color: "common.white",
                fontWeight: 700,
                fontSize: "1.05rem",
                lineHeight: 1,
              }}
            >
              I
            </Typography>
          </Box>
        </Box>
      )}

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
      {showMondayUsage && <MondayUsageCounter collapsed={!sidebarOpen} />}
      <SidebarFooter />
    </div>
  );
}

export default Sidebar;
