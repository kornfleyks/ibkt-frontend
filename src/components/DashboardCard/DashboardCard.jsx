import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

function DashboardCard({
    title,
    value,
    icon,
    color = 'primary.main',
    loading = false,
    caption = null
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
                            bgcolor: 'action.hover'
                        }}
                    >
                        {icon}
                    </Box>

                </Box>



                <Box
                    sx={{
                        mt: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        height: 48
                    }}
                >

                    {loading ? (
                        <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                    ) : (
                        <Typography
                            variant="h3"
                            sx={{ fontWeight: 600 }}
                        >
                            {value}
                        </Typography>
                    )}

                </Box>

                {caption && !loading && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {caption}
                    </Typography>
                )}

            </CardContent>

        </Card>

    );

}

export default DashboardCard;