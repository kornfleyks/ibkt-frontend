import { Box, Card, CardContent, Typography } from '@mui/material';

// The signed-out pages (Sign In, Create Account, Forgot / Reset Password):
// the app name above a centred card titled for the page.
function AuthLayout({ title, width = 400, children }) {

    return (

        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                px: 2
            }}
        >

            <Typography variant="h4" component="p" fontWeight={600} sx={{ mb: 3 }}>
                IBKT
            </Typography>

            <Card sx={{ width: '100%', maxWidth: width }}>

                <CardContent>

                    <Typography variant="h5" component="h1" textAlign="center" fontWeight={600} sx={{ mb: 4 }}>
                        {title}
                    </Typography>

                    {children}

                </CardContent>

            </Card>

        </Box>

    );

}

export default AuthLayout;
