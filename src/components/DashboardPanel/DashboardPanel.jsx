import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

function DashboardPanel({
    title,
    children
}) {

    return (

        <Card
            sx={{
                height: '100%'
            }}
        >

            <CardContent>

                <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ mb: 2 }}
                >
                    {title}
                </Typography>


                <Divider sx={{ mb: 2 }} />


                {children}


            </CardContent>

        </Card>

    );

}

export default DashboardPanel;