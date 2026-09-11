import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function DashboardCard({
    title,
    value,
    icon,
    color = 'primary.main'
}) {

    return (

        <Card
            sx={{
                height: '100%',
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-2px)'
                }
            }}
        >

            <CardContent>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                    }}
                >

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 500 }}
                    >
                        {title}
                    </Typography>


                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color,
                            bgcolor: (theme) => theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(30,41,59,0.06)'
                        }}
                    >
                        {icon}
                    </Box>

                </Box>



                <Typography
                    variant="h3"
                    fontWeight={700}
                    sx={{
                        mt: 2.5
                    }}
                >

                    {value}

                </Typography>


            </CardContent>

        </Card>

    );

}

export default DashboardCard;