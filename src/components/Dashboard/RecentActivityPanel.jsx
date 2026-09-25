import { Link as RouterLink } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import DashboardPanel from '../DashboardPanel';
import activityTypes, { DEFAULT_ACTIVITY_TYPE } from '../ActivityLog/activityTypes';
import { getActivityEntryLink } from '../../utils/recentActivity';
import { formatRelativeTime } from '../../utils/relativeTime';

// `entries` is null while loading; `error` is set when they couldn't load.
// `canViewAll` shows the link to the (Admin-only) Activity Log page.
function RecentActivityPanel({ entries, error = false, canViewAll = false }) {
    return (
        <DashboardPanel title="Recent Activity">
            {error ? (
                <Typography variant="body2" color="error">
                    Couldn't load recent activity.
                </Typography>
            ) : entries === null ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} sx={{ color: 'text.secondary' }} />
                </Box>
            ) : entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No recent activity.
                </Typography>
            ) : (
                // Descriptions can be long and wrap, so the list scrolls
                // rather than stretching the whole panel row.
                <List disablePadding sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    {entries.map((entry) => {
                        const type = activityTypes[entry.actionType] || DEFAULT_ACTIVITY_TYPE;
                        const Icon = type.icon;
                        const link = getActivityEntryLink(entry);
                        const when = formatRelativeTime(entry.occurredAt) ?? entry.timestamp;

                        return (
                            <ListItemButton
                                key={entry.id}
                                component={link ? RouterLink : 'div'}
                                to={link ?? undefined}
                                disabled={!link}
                                sx={{
                                    borderRadius: 1,
                                    px: 1,
                                    alignItems: 'flex-start',
                                    // Unlinkable rows stay fully readable, just not clickable.
                                    '&.Mui-disabled': { opacity: 1 },
                                }}
                            >
                                <ListItemAvatar sx={{ minWidth: 44, mt: 0.5 }}>
                                    <Avatar sx={{ bgcolor: type.color, color: '#fff', width: 32, height: 32 }}>
                                        <Icon sx={{ fontSize: 16 }} />
                                    </Avatar>
                                </ListItemAvatar>

                                <ListItemText
                                    primary={entry.description}
                                    secondary={when}
                                    slotProps={{ primary: { variant: 'body2' } }}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            )}

            {canViewAll && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button component={RouterLink} to="/activity" size="small">
                        View all
                    </Button>
                </Box>
            )}
        </DashboardPanel>
    );
}

export default RecentActivityPanel;
