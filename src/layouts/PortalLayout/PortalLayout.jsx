import { NavLink, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';

import useAuth from '../../hooks/useAuth';
import BrandMark from '../../components/Brand/BrandMark';
import { portalOfRole } from '../../constants/roles';

// The links of each portal's top bar, by portal name (constants/roles.js PORTALS).
const LINKS_BY_PORTAL = {
    rescuer: [
        { label: 'My Cats', to: '/rescuer' },
        { label: 'Add Cat', to: '/rescuer/add-cat' },
    ],
    foster: [{ label: 'My Foster Cats', to: '/foster' }],
};

// The portals' frame (rescuer and foster): a plain top bar (no staff sidebar,
// search or notifications) and the page below it.
function PortalLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const portal = portalOfRole(user?.role);
    const links = LINKS_BY_PORTAL[portal?.name] ?? [];

    function handleLogout() {
        logout();
        navigate(portal?.signIn ?? '/login');
    }

    return (
        <Box sx={{ minHeight: '100vh' }}>
            <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider', py: 1.5 }}>
                <Container maxWidth="md">
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                        <Box sx={{ mr: 2, lineHeight: 0 }}>
                            <BrandMark variant="logo" height={36} />
                        </Box>

                        {links.map((link) => (
                            <Button
                                key={link.to}
                                component={NavLink}
                                to={link.to}
                                end
                                color="inherit"
                                sx={{ '&.active': { fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 6 } }}
                            >
                                {link.label}
                            </Button>
                        ))}

                        <Box sx={{ flexGrow: 1 }} />

                        <Typography variant="body2" color="text.secondary">
                            {user?.firstName} {user?.lastName}
                        </Typography>

                        <Button size="small" onClick={handleLogout}>
                            Sign out
                        </Button>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="md" sx={{ py: 4 }}>
                {children}
            </Container>
        </Box>
    );
}

export default PortalLayout;
