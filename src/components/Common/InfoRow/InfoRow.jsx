import { Box, Typography } from '@mui/material';

function InfoRow({
    label,
    value
}) {

    return (

        <Box
            sx={{
                display:'flex',
                alignItems:'center',
                py:.5
            }}
        >

            <Typography
                sx={{
                    width:120,
                    fontWeight:600,
                    color:'text.secondary'
                }}
            >
                {label}
            </Typography>

            <Typography>
                {value ?? '—'}
            </Typography>

        </Box>

    );

}

export default InfoRow;