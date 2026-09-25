import { useLayout } from "../../context/LayoutContext";
import MenuIcon from '@mui/icons-material/MenuOutlined';
import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

import { useThemeMode } from "../../context/ThemeContext";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";

function Header() {
    const {
        sidebarOpen,
        setSidebarOpen
    } = useLayout();

    const {
        darkMode,
        toggleDarkMode
    } = useThemeMode();
    
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const [anchorEl, setAnchorEl] = useState(null);

    const profileMenuOpen = Boolean(anchorEl);

    function handleProfileClick(event) {
        setAnchorEl(event.currentTarget);
    }

    function handleProfileClose() {
        setAnchorEl(null);
    }


    function handleLogout() {
        logout();
        handleProfileClose();
        navigate("/login");
    }


    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '100%'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>

                <IconButton
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    <MenuIcon />
                </IconButton>

                <Typography variant="h6" component="h1">
                    IBKT System
                </Typography>

            </Box>

            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', px: 2, minWidth: 0 }}>
                <GlobalSearch />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <IconButton
                    onClick={toggleDarkMode}
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {
                        darkMode
                            ? <LightModeIcon fontSize="small" />
                            : <DarkModeIcon fontSize="small" />
                    }
                </IconButton>

                <NotificationBell />

                <IconButton
                    onClick={handleProfileClick}
                    aria-label="Open account menu"
                    sx={{ p: 0 }}
                >
                    <Avatar
                        sx={{
                            width: 36,
                            height: 36,
                            bgcolor: "primary.main"
                        }}
                    >
                        {user?.firstName?.[0]?.toUpperCase() ?? '?'}
                    </Avatar>
                </IconButton>

                <Menu
                    anchorEl={anchorEl}
                    open={profileMenuOpen}
                    onClose={handleProfileClose}
                >
                    <MenuItem onClick={handleProfileClose}>
                        Profile
                    </MenuItem>

                    <MenuItem onClick={handleProfileClose}>
                        Settings
                    </MenuItem>

                    <MenuItem onClick={handleLogout}>
                        Logout
                    </MenuItem>
                </Menu>
            </Box>

        </Box>
    );
}

export default Header;