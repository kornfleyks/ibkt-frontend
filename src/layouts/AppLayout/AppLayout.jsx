import { useLayout } from "../../context/LayoutContext";
import Sidebar from "../../components/Sidebar/Sidebar";
import Header from "../../components/Header/Header";
import useResponsive from "../../hooks/useResponsive";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import AppBreadcrumbs from "../../components/Breadcrumbs";
import RoleChangeNotice from "../../components/RoleChangeNotice/RoleChangeNotice";

const DRAWER_WIDTH = 250;
const COLLAPSED_DRAWER_WIDTH = 70;

function AppLayout({ children }) {
    const { isMobile } = useResponsive();
    const {
                sidebarOpen,
                setSidebarOpen
        } = useLayout();

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>

            <Drawer
                variant={isMobile ? "temporary" : "permanent"}
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                sx={{
                    width: sidebarOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: sidebarOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        padding: '20px',
                        transition: 'width 0.3s ease',
                        overflowX: 'hidden'
                    }
                }}
            >
                <Sidebar />
            </Drawer>


            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                <Box
                    sx={{
                        height: '70px',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        px: 2.5
                    }}
                >
                    <Header />
                </Box>


                <Box sx={{ flex: 1, p: 2.5, overflow: 'auto' }}>

                    <AppBreadcrumbs />

                    {children}

                    <RoleChangeNotice />

                </Box>

            </Box>

        </Box>
    );
}

export default AppLayout;