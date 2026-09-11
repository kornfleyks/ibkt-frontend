import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';


function PageHeader({
    title,
    subtitle,
    actions
}) {

    return (

        <Box

            sx={{

                display: 'flex',

                justifyContent: 'space-between',

                alignItems: 'flex-start',

                mb: 4

            }}

        >


            <Box>


                <Typography

                    variant="h4"

                    fontWeight={600}

                >

                    {title}

                </Typography>



                {

                    subtitle && (

                        <Typography

                            color="text.secondary"

                            sx={{

                                mt: 0.5

                            }}

                        >

                            {subtitle}

                        </Typography>

                    )

                }


            </Box>



            {

                actions && (

                    <Box>

                        {actions}

                    </Box>

                )

            }


        </Box>

    );

}


export default PageHeader;