import { useTheme } from "@mui/material/styles";
import { useLayout } from "../../context/LayoutContext";
import useAuth from "../../hooks/useAuth";

function SidebarFooter() {

    const theme = useTheme();
    const { sidebarOpen } = useLayout();
    const { user } = useAuth();

    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
        : '';

    return (

        <div
            style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: `1px solid ${theme.palette.divider}`,
                textAlign: sidebarOpen ? 'left' : 'center'
            }}
        >

            <div
                style={{
                    fontWeight: 600
                }}
            >
                {sidebarOpen ? (initials || '👤') : '👤'}
            </div>


            {sidebarOpen && (

                <>
                    <div
                        style={{
                            fontSize: '14px',
                            opacity: 0.8
                        }}
                    >
                        {user?.role}
                    </div>


                    <div
                        style={{
                            fontSize: '12px',
                            opacity: 0.5,
                            marginTop: '10px'
                        }}
                    >
                        v0.1.0
                    </div>

                </>

            )}

        </div>

    );

}

export default SidebarFooter;