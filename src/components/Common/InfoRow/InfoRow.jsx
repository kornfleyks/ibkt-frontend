import { isValidElement } from 'react';
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
                    minWidth:labelWidth,
                    flexShrink:0,
                    whiteSpace:'nowrap',
                    fontWeight:600,
                    color:'text.secondary'
                }}
            >
                {label}
            </Typography>

            {/* Elements (e.g. chips) can't sit inside Typography's <p>. */}
            {isValidElement(value) ? (
                <Box>{value}</Box>
            ) : (
                <Typography>
                    {value ?? '—'}
                </Typography>
            )}

        </Box>

    );

}

export default InfoRow;