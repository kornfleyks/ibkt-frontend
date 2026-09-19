import { Box, Typography } from '@mui/material';

function InfoRow({
    label,
    value,
    labelWidth = 120
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
                    width:labelWidth,
                    flexShrink:0,
                    whiteSpace:'nowrap',
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