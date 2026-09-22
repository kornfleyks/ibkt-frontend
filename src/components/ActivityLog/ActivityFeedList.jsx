import { Link as RouterLink } from 'react-router-dom';
import { Stack, Typography, Avatar, Box, Chip, Link } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import activityTypes, { DEFAULT_ACTIVITY_TYPE } from './activityTypes';

// Board name -> route, for entries that can be jumped to directly. Only
// Users has a page today; entries for boards without one just render as
// plain text. This component is Admin-only in practice (the global feed is
// the only place Users-board entries appear), so no extra role check is
// needed here beyond the route itself already being Admin-only.
const BOARD_LINKS = {
    Users: '/users',
};

// Only a Register event is actually about a *new* user account worth
// jumping to for approval - other Users-board actions (login, role change,
// password reset) aren't about "a registered user" in that sense.
function isLinkableEntry(entry) {
    return entry.board in BOARD_LINKS && entry.actionType === 'Register';
}

// Shared row rendering for both a single item's Activity tab and the global
// Activity feed - `showItemContext` adds a board/item chip, which only the
// global feed (not scoped to one item already) needs.
function ActivityFeedList({ entries, showItemContext = false, emptyMessage = 'No activity recorded yet.' }) {
    if (entries.length === 0) {
        return (
            <Typography color="text.secondary" sx={{ py: 2 }}>
                {emptyMessage}
            </Typography>
        );
    }

    return (
        <Stack spacing={3}>
            {entries.map((entry) => {
                const type = activityTypes[entry.actionType] || DEFAULT_ACTIVITY_TYPE;
                const Icon = type.icon;
                const linkTo = isLinkableEntry(entry) ? BOARD_LINKS[entry.board] : null;

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
                                {linkTo ? (
                                    <Link
                                        component={RouterLink}
                                        to={linkTo}
                                        color="text.primary"
                                        underline="always"
                                        fontWeight={600}
                                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                                    >
                                        {entry.description}
                                        <ArrowForwardIcon sx={{ fontSize: 14 }} />
                                    </Link>
                                ) : (
                                    <Typography fontWeight={600}>{entry.description}</Typography>
                                )}

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
