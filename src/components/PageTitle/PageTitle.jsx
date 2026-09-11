import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function PageTitle({
    title,
    subtitle
}) {

    return (

        <Box
            sx={{
                mb: 3
            }}
        >

            <Typography
                variant="h4"
                fontWeight={600}
            >
                {title}
            </Typography>


            {subtitle && (

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mt: 0.5
                    }}
                >

                    {subtitle}

                </Typography>

            )}

        </Box>

    );

}

export default PageTitle;