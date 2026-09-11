import {
    Card,
    CardContent,
    Typography
} from '@mui/material';

function SectionCard({
        title,
        children
    }) 
    {
        return (
            <Card>
                <CardContent>
                    {title && (
                        <Typography
                            variant="h6"
                            fontWeight={600}
                            sx={{
                                mb:2
                            }}
                        >
                            {title}
                        </Typography>
                    )}
                    {children}
                </CardContent>
            </Card>
        );
}
export default SectionCard;