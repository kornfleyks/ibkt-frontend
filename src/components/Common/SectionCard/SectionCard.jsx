import {
    Card,
    CardContent,
    Typography
} from '@mui/material';

// `sx` styles the card itself, e.g. { height: "100%" } so cards side by side
// in a grid row are the same height.
function SectionCard({
        title,
        children,
        sx
    })
    {
        return (
            <Card sx={sx}>
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