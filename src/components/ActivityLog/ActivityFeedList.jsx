import { Stack, Typography, Avatar, Box, Chip } from '@mui/material';
import activityTypes, { DEFAULT_ACTIVITY_TYPE } from './activityTypes';

// Shared row rendering for both a single item's Activity tab and the global
// Activity feed - `showItemContext` adds a board/item chip, which only the
// global feed (not scoped to one item already) needs.
function ActivityFeedList({ entries, showItemContext = false }) {
    if (entries.length === 0) {
        return (
            <Typography color="text.secondary" sx={{ py: 2 }}>
                No activity recorded yet.
            </Typography>
        );
    }

    return (
        <Stack spacing={3}>
            {entries.map((entry) => {
                const type = activityTypes[entry.actionType] || DEFAULT_ACTIVITY_TYPE;
                const Icon = type.icon;

                return (
                    <Box
                        key={entry.id}
                        sx={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'flex-start',
                        }}
                    >
                        <Avatar
                            sx={{
                                bgcolor: type.color,
                                color: '#fff',
                                width: 40,
                                height: 40,
                            }}
                        >
                            <Icon sx={{ fontSize: 20 }} />
                        </Avatar>

                        <Box flex={1}>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                                <Typography fontWeight={600}>{entry.description}</Typography>

                                {showItemContext && entry.board && (
                                    <Chip label={entry.board} size="small" variant="outlined" />
                                )}
                            </Stack>

                            <Typography variant="body2" color="text.secondary">
                                {entry.timestamp} • {entry.actorName || 'Unknown'}
                            </Typography>
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
}

export default ActivityFeedList;
