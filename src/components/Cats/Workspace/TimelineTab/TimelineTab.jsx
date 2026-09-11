import {

    Stack,
    Typography,
    Avatar,
    Box

} from '@mui/material';
import timelineTypes from './timelineTypes';
import SectionCard from '../../../Common/SectionCard';



function TimelineTab({ cat }) {

    return (
        <SectionCard title="Timeline">
                <Stack
                    spacing={3}
                >
                    {
                        cat.timeline.map(event => {
                            const item = timelineTypes[event.type];
                            const Icon = item.icon;
                            return (
                                <Box
                                    key={event.id}
                                    sx={{
                                        display: 'flex',
                                        gap: 2,
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            bgcolor: `${item.color}.main`,
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        <Icon
                                            sx={{
                                                fontSize: 20
                                            }}
                                        />
                                    </Avatar>
                                    <Box>
                                        <Typography
                                            fontWeight={600}
                                        >
                                            {event.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {event.date}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })
                    }
                </Stack>
        </SectionCard>
    );
}
export default TimelineTab;