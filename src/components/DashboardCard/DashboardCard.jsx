import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ButtonBase from '@mui/material/ButtonBase';

// `onValueClick` makes the number a button (e.g. to list what it counts);
// only while there's something to show - not for 0 or while loading.
function DashboardCard({
    title,
    value,
    icon,
    color = 'primary.main',
    loading = false,
    caption = null,
    onValueClick = null
}) {

    const clickable = Boolean(onValueClick) && !loading && Number(value) > 0;

    const valueText = (
        <Typography
            variant="h3"
            sx={{ fontWeight: 600 }}
        >
            {value}
        </Typography>
    );

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
                    ) : clickable ? (
                        <ButtonBase
                            onClick={onValueClick}
                            aria-label={`${title}: show the ${value}`}
                            sx={{
                                borderRadius: 1,
                                px: 1,
                                mx: -1,
                                '&:hover, &.Mui-focusVisible': { bgcolor: 'action.hover', color: 'primary.main' }
                            }}
                        >
                            {valueText}
                        </ButtonBase>
                    ) : (
                        valueText
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