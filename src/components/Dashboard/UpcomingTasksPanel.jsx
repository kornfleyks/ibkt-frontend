import { Fragment } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import DashboardPanel from '../DashboardPanel';
import { formatDueDate, isTaskOverdue, todayDateString } from '../../utils/taskStatus';

const MAX_ITEMS = 5;

function formatDue(task, today) {
    if (task.dueDate === today) {
        return 'Due today';
    }

    return `Due ${formatDueDate(task.dueDate)}`;
}

// `tasks` (from selectUpcomingTasks) is null while loading; `error` is set
// when they couldn't load. Tasks due within `days` come first; any spare
// of the MAX_ITEMS slots are filled with the next ones, under "Later".
// `showOwner` adds each task's owner - for Admins, who see everyone's tasks.
function UpcomingTasksPanel({ tasks, days, error = false, showOwner = false }) {
    const today = todayDateString();
    const visible = tasks?.slice(0, MAX_ITEMS) ?? [];
    const windowCount = tasks?.filter((task) => !task.beyondWindow).length ?? 0;

    return (
        <DashboardPanel title="Upcoming Tasks">
            {error ? (
                <Typography variant="body2" color="error">
                    Couldn't load tasks.
                </Typography>
            ) : tasks === null ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} sx={{ color: 'text.secondary' }} />
                </Box>
            ) : tasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    No open tasks with a due date.
                </Typography>
            ) : (
                // Same height cap as Recent Activity so the panel row stays even;
                // scrolls (scrollbar hidden app-wide) when titles wrap.
                <List disablePadding sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    {visible.map((task, position) => {
                        const overdue = isTaskOverdue(task, today);
                        const startsLater = task.beyondWindow && !visible[position - 1]?.beyondWindow;

                        return (
                            <Fragment key={task.id}>
                                {startsLater && (
                                    <ListSubheader disableSticky sx={{ px: 1, lineHeight: 2, bgcolor: 'transparent' }}>
                                        {windowCount === 0 ? `Nothing due in the next ${days} days - next up` : `Later than ${days} days`}
                                    </ListSubheader>
                                )}

                                <ListItemButton
                                    component={RouterLink}
                                    // No task detail page - the Tasks list, searched for it.
                                    to={`/tasks?tab=all&q=${encodeURIComponent(task.title)}`}
                                    sx={{ borderRadius: 1, px: 1 }}
                                >
                                    <ListItemText
                                        primary={task.title}
                                        secondary={[showOwner && task.ownerName, task.linkedCatName, formatDue(task, today)].filter(Boolean).join(' · ')}
                                        slotProps={{
                                            secondary: { color: overdue ? 'error' : 'text.secondary' },
                                        }}
                                    />

                                    {overdue && <Chip label="Overdue" size="small" color="error" sx={{ ml: 1 }} />}
                                </ListItemButton>
                            </Fragment>
                        );
                    })}
                </List>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    {windowCount > MAX_ITEMS ? `Showing ${MAX_ITEMS} of ${windowCount} due in the next ${days} days` : ''}
                </Typography>

                <Button component={RouterLink} to="/tasks?tab=open" size="small">
                    View all
                </Button>
            </Box>
        </DashboardPanel>
    );
}

export default UpcomingTasksPanel;
