import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Forbidden() {

    const navigate = useNavigate();

    return (

        <Box

            sx={{

                minHeight: '100vh',

                display: 'flex',

                flexDirection: 'column',

                justifyContent: 'center',

                alignItems: 'center',

                gap: 2

            }}

        >


            <Typography

                variant="h1"

                fontWeight={700}

            >

                403

            </Typography>


            <Typography

                variant="h5"

            >

                Access Denied

            </Typography>



            <Typography

                color="text.secondary"

            >

                You do not have permission to access this page.

            </Typography>



            <Button

                variant="contained"

                onClick={() => navigate('/dashboard')}

            >

                Back to Dashboard

            </Button>


        </Box>

    );

}

export default Forbidden;