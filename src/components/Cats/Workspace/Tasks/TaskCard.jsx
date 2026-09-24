import { useState } from 'react';
import {
    Card,
    CardContent,
    Stack,
    Typography,
    Chip,
    Checkbox,
    Box,
    IconButton,
    TextField,
    MenuItem,
    Autocomplete,
    CircularProgress,
    Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import CheckIcon from '@mui/icons-material/CheckOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import PetsIcon from '@mui/icons-material/PetsOutlined';
import { Link as RouterLink } from 'react-router-dom';

import {
    updateTaskTitle,
    updateTaskDescription,
    updateTaskStatus,
    updateTaskPriority,
    updateTaskDueDate,
    updateTaskOwner,
    updateTaskWaitingReason,
} from '../../../../services/TasksService';
import { TASKS_STATUS_OPTIONS } from '../../../../constants/statuses/tasksStatuses';
import { isTaskOverdue } from '../../../../utils/taskStatus';

const STATUS_OPTIONS = Object.values(TASKS_STATUS_OPTIONS.STATUS);
const PRIORITY_OPTIONS = Object.values(TASKS_STATUS_OPTIONS.PRIORITY);

function getStatusColor(status) {
    switch (status) {
        case 'Completed':
            return 'success';

        case 'Waiting':
            return 'warning';

        case 'New':
            return 'info';

        case 'Cancelled':
            return 'error';

        default:
            return 'default';
    }
}

// showCat / highlightOverdue are for lists spanning many cats (the Tasks
// page); a cat's own Tasks tab leaves them off.
function TaskCard({ task, titleOptions, users, onUpdate, showCat = false, highlightOverdue = false }) {
    // 'read' - the compact card; 'view' - the full form, read-only; 'edit' - the full form, editable.
    const [mode, setMode] = useState('read');
    const [toggling, setToggling] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? '');
    const [status, setStatus] = useState(task.status);
    const [priority, setPriority] = useState(task.priority);
    const [dueDate, setDueDate] = useState(task.dueDate ?? '');
    const [owner, setOwner] = useState(
        task.ownerId ? { id: task.ownerId, name: task.ownerName } : null,
    );
    const [waitingReason, setWaitingReason] = useState(task.waitingReason ?? '');

    const isCompleted = task.status === 'Completed';
    const overdue = highlightOverdue && isTaskOverdue(task);

    function loadFieldsFromTask() {
        setTitle(task.title);
        setDescription(task.description ?? '');
        setStatus(task.status);
        setPriority(task.priority);
        setDueDate(task.dueDate ?? '');
        setOwner(task.ownerId ? { id: task.ownerId, name: task.ownerName } : null);
        setWaitingReason(task.waitingReason ?? '');
    }

    function startEditing() {
        loadFieldsFromTask();
        setError(null);
        setMode('edit');
    }

    function startViewing() {
        loadFieldsFromTask();
        setError(null);
        setMode('view');
    }

    async function handleToggle() {
        setToggling(true);

        try {
            const newStatus = isCompleted ? TASKS_STATUS_OPTIONS.STATUS.NEW : TASKS_STATUS_OPTIONS.STATUS.COMPLETED;

            await updateTaskStatus(task.id, newStatus);

            const updates = { status: newStatus };

            if (task.status === TASKS_STATUS_OPTIONS.STATUS.WAITING) {
                await updateTaskWaitingReason(task.id, '');
                updates.waitingReason = '';
            }

            onUpdate(task.id, updates);
        } catch (err) {
            console.error('Failed to update task status:', err);
        } finally {
            setToggling(false);
        }
    }

    async function handleSave() {
        if (!title.trim()) {
            setError('Title is required.');
            return;
        }

        if (!description.trim()) {
            setError('Description is required.');
            return;
        }

        if (status === TASKS_STATUS_OPTIONS.STATUS.WAITING && !waitingReason.trim()) {
            setError('Waiting Reason is required.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const updates = {};

            if (title !== task.title) {
                await updateTaskTitle(task.id, title);
                updates.title = title;
            }

            if (description !== (task.description ?? '')) {
                await updateTaskDescription(task.id, description);
                updates.description = description;
            }

            if (status !== task.status) {
                await updateTaskStatus(task.id, status);
                updates.status = status;
            }

            if (priority !== task.priority) {
                await updateTaskPriority(task.id, priority);
                updates.priority = priority;
            }

            if (dueDate !== (task.dueDate ?? '')) {
                await updateTaskDueDate(task.id, dueDate || null);
                updates.dueDate = dueDate || null;
            }

            if ((owner?.id ?? null) !== task.ownerId) {
                await updateTaskOwner(task.id, owner?.id ?? null);
                updates.ownerId = owner?.id ?? null;
                updates.ownerName = owner?.name ?? 'Unassigned';
            }

            const leavingWaiting = task.status === TASKS_STATUS_OPTIONS.STATUS.WAITING
                && status !== TASKS_STATUS_OPTIONS.STATUS.WAITING;

            if (leavingWaiting) {
                await updateTaskWaitingReason(task.id, '');
                updates.waitingReason = '';
            } else if (waitingReason !== (task.waitingReason ?? '')) {
                await updateTaskWaitingReason(task.id, waitingReason);
                updates.waitingReason = waitingReason;
            }

            onUpdate(task.id, updates);
            setMode('read');
        } catch (err) {
            console.error('Failed to update task:', err);
            setError('Something went wrong while saving.');
        } finally {
            setSaving(false);
        }
    }

    if (mode === 'view' || mode === 'edit') {
        const readOnly = mode === 'view';

        return (
            <Card variant="outlined">
                <CardContent>
                    <Stack spacing={1.5}>
                        <Autocomplete
                            freeSolo
                            size="small"
                            options={titleOptions}
                            value={title}
                            disabled={readOnly}
                            onInputChange={(event, value) => setTitle(value)}
                            renderInput={(params) => <TextField {...params} label="Title" disabled={saving || readOnly} />}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            multiline
                            minRows={2}
                            label="Description"
                            disabled={saving || readOnly}
                            value={readOnly ? (description || '—') : description}
                            onChange={(event) => setDescription(event.target.value)}
                        />

                        <Stack direction="row" spacing={1.5}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Status"
                                disabled={saving || readOnly}
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                fullWidth
                                size="small"
                                label="Priority"
                                disabled={saving || readOnly}
                                value={priority}
                                onChange={(event) => setPriority(event.target.value)}
                            >
                                {PRIORITY_OPTIONS.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>

                        {(readOnly || status === TASKS_STATUS_OPTIONS.STATUS.WAITING) && (
                            <TextField
                                fullWidth
                                size="small"
                                multiline
                                minRows={2}
                                label="Waiting Reason"
                                disabled={saving || readOnly}
                                value={readOnly ? (waitingReason || '—') : waitingReason}
                                onChange={(event) => setWaitingReason(event.target.value)}
                            />
                        )}

                        <Stack direction="row" spacing={1.5}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Due Date"
                                disabled={saving || readOnly}
                                slotProps={{ inputLabel: { shrink: true } }}
                                value={dueDate}
                                onChange={(event) => setDueDate(event.target.value)}
                                sx={{ '& input': { minWidth: 130 } }}
                            />

                            <Autocomplete
                                fullWidth
                                size="small"
                                options={users}
                                disabled={saving || readOnly}
                                getOptionLabel={(option) => option.name ?? ''}
                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                value={owner}
                                onChange={(event, value) => setOwner(value)}
                                renderInput={(params) => <TextField {...params} label="Owner" placeholder="Unassigned" />}
                            />
                        </Stack>

                        {error && (
                            <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>
                                {error}
                            </Alert>
                        )}

                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                            {readOnly ? (
                                <IconButton size="small" onClick={() => setMode('read')} aria-label="Close">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            ) : (
                                <>
                                    <IconButton size="small" onClick={() => setMode('read')} disabled={saving} aria-label="Cancel">
                                        <CloseIcon fontSize="small" />
                                    </IconButton>

                                    <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save task">
                                        {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                                    </IconButton>
                                </>
                            )}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card
            variant="outlined"
            sx={{
                '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                    opacity: 1,
                },
            }}
        >
            <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <Checkbox
                        checked={isCompleted}
                        onChange={handleToggle}
                        disabled={toggling}
                        color="success"
                    />

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    textDecoration: isCompleted ? 'line-through' : 'none'
                                }}
                            >
                                {task.title}
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                {overdue && (
                                    <Chip label="Overdue" size="small" color="error" />
                                )}

                                <Chip
                                    label={task.priority}
                                    size="small"
                                    variant="outlined"
                                />

                                <Chip
                                    label={task.status}
                                    size="small"
                                    color={getStatusColor(task.status)}
                                />

                                <IconButton
                                    size="small"
                                    onClick={startViewing}
                                    aria-label="View task"
                                    className="row-edit-button"
                                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                                >
                                    <VisibilityIcon fontSize="small" />
                                </IconButton>

                                <IconButton
                                    size="small"
                                    onClick={startEditing}
                                    aria-label="Edit task"
                                    className="row-edit-button"
                                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Stack>

                        {showCat && task.linkedCatId && (
                            <Chip
                                icon={<PetsIcon />}
                                label={task.linkedCatName || 'Cat'}
                                size="small"
                                variant="outlined"
                                component={RouterLink}
                                to={`/cats/${task.linkedCatId}`}
                                clickable
                                sx={{ mt: 0.5, mb: 0.5 }}
                            />
                        )}

                        {task.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Description: {task.description}
                            </Typography>
                        )}

                        <Typography variant="body2" color="text.secondary">
                            Owner: {task.ownerName}
                        </Typography>

                        <Typography
                            variant="body2"
                            color={overdue ? 'error' : 'text.secondary'}
                            sx={{ fontWeight: overdue ? 600 : undefined }}
                        >
                            Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </Typography>

                        {task.status === TASKS_STATUS_OPTIONS.STATUS.WAITING && task.waitingReason && (
                            <Typography variant="body2" color="text.secondary">
                                Waiting Reason: {task.waitingReason}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default TaskCard;
