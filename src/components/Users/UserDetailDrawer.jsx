import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import InfoRow from '../Common/InfoRow';
import { getUserOpenWork } from '../../services/UsersService';
import { formatRelativeTime } from '../../utils/relativeTime';

function WorkList({ title, items, emptyText, linkFor, secondaryFor }) {
    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {title} ({items.length})
            </Typography>

            {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    {emptyText}
                </Typography>
            ) : (
                <List dense disablePadding>
                    {items.map((item) => (
                        <ListItemButton key={item.id} component={RouterLink} to={linkFor(item)} sx={{ borderRadius: 1 }}>
                            <ListItemText primary={item.name} secondary={secondaryFor(item)} />
                        </ListItemButton>
                    ))}
                </List>
            )}
        </Box>
    );
}

// Side panel for one user: account details plus the open cases and tasks
// they own (the same "open" definition the server uses for hand-overs).
// `user` null = closed.
function UserDetailDrawer({ user, onClose }) {
    const [work, setWork] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            return undefined;
        }

        let cancelled = false;

        getUserOpenWork(user.id)
            .then((data) => {
                if (!cancelled) {
                    setWork(data);
                }
            })
            .catch((err) => {
                console.error('Failed to load open work:', err);

                if (!cancelled) {
                    setError("Couldn't load this user's cases and tasks.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const name = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : '';

    return (
        <Drawer anchor="right" open={Boolean(user)} onClose={onClose}>
            {user && (
                <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 3 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">{name}</Typography>

                        <IconButton onClick={onClose} aria-label="Close">
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Role" value={user.role} />
                    <InfoRow label="Status" value={user.accountStatus} />
                    <InfoRow label="Last login" value={formatRelativeTime(user.lastLogin) ?? 'Never'} />

                    <Divider sx={{ my: 2 }} />

                    {error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : !work ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <CircularProgress size={24} sx={{ color: 'text.secondary' }} />
                        </Box>
                    ) : (
                        <Stack spacing={2}>
                            <WorkList
                                title="Open cases"
                                items={work.cases}
                                emptyText="No open cases."
                                linkFor={(item) => `/active-applications/${item.id}`}
                                secondaryFor={(item) => item.stage}
                            />

                            <WorkList
                                title="Open tasks"
                                items={work.tasks}
                                emptyText="No open tasks."
                                linkFor={(item) => `/tasks?tab=all&q=${encodeURIComponent(item.name)}`}
                                secondaryFor={(item) => item.status}
                            />

                            {(work.cases.length > 0 || work.tasks.length > 0) && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label="Suspending or archiving hands these to you"
                                    sx={{ alignSelf: 'flex-start' }}
                                />
                            )}
                        </Stack>
                    )}
                </Box>
            )}
        </Drawer>
    );
}

export default UserDetailDrawer;
