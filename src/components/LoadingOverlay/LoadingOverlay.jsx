import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function LoadingOverlay({
    open = false,
    message = 'Loading...'
}) {

    return (

        <Backdrop
            open={open}
            sx={{
                color: 'common.white',
                zIndex: (theme) => theme.zIndex.drawer + 1000
            }}
        >

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2
                }}
            >

                <CircularProgress
                    color="inherit"
                />

                <Typography
                    variant="body1"
                >

                    {message}

                </Typography>

            </Box>

        </Backdrop>

    );

}

export default LoadingOverlay;