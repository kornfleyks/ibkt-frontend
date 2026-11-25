import { Box, Typography } from '@mui/material';

// The band at the foot of the public pages that Mia's mock-ups show: Midnight,
// with the legal line of the charity and "Powered by Oriel". Midnight and Cream
// are the brand colours, the same in the light and the dark theme.
function BrandFooter() {
    return (
        <Box component="footer" sx={{ bgcolor: '#3E3447', color: '#FFF9F5', px: 3, py: 3.5 }}>
            <Box sx={{ maxWidth: 560, mx: 'auto' }}>
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                    Itty Bitty Kitty Tails Ltd is a non-profit company limited by guarantee, registered in England and Wales, no. 13158673
                </Typography>

                <Typography variant="body2" sx={{ color: '#B3A7BE', mt: 1.5 }}>
                    Powered by Oriel
                </Typography>
            </Box>
        </Box>
    );
}

export default BrandFooter;
