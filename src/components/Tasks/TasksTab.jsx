import { useEffect, useState } from 'react';

import {
    Stack,
    Typography,
    Button,
    Box,
    Alert,
    CircularProgress
} from '@mui/material';

import { AddIcon } from '../icons';

import TaskCard from './TaskCard';
import AddTaskDialog from './AddTaskDialog';
import { getLinkedTasks, getTaskTitleOptions } from '../../services/TasksService';
import { getUsers } from '../../services/UsersService';
import MyCasesToggle from '../Common/MyCasesToggle';
import useMyCasesFilter from '../../hooks/useMyCasesFilter';

// The tasks on one cat or application. `link` is { catId } or
// { applicationId } (new tasks are linked to it too), `noun` names it in
// the empty-list text. `ownTasksOnly`: whether non-Admins see only the
// tasks assigned to them (a cat's tab) or all of them (an application's
// tab - only its Case Owner and Admins can open it). Admins always get the
// "My tasks" toggle, remembered per `pageKey`.
function TasksTab({ link, noun, pageKey, ownTasksOnly = true }) {
    const [tasks, setTasks] = useState([]);
    const [titleOptions, setTitleOptions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const myTasks = useMyCasesFilter(pageKey, 'ownerId');
    const { catId, applicationId } = link;

    useEffect(() => {
        let cancelled = false;

        async function loadTasks() {
            setLoading(true);
            setError(null);

            try {
                const data = await getLinkedTasks({ catId, applicationId });

                if (!cancelled) {
                    setTasks(data);
                }
            } catch (err) {
                console.error('Failed to load tasks:', err);

                if (!cancelled) {
                    setError('Failed to load tasks.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadTasks();

        return () => {
            cancelled = true;
        };

    }, [catId, applicationId]);

    useEffect(() => {

        getTaskTitleOptions()
            .then(setTitleOptions)
            .catch((err) => console.error('Failed to load task title options:', err));

        getUsers()
            .then(setUsers)
            .catch((err) => console.error('Failed to load users:', err));

    }, []);

    const visibleTasks = ownTasksOnly || myTasks.canToggle ? myTasks.filter(tasks) : tasks;

    function handleTaskUpdate(taskId, updates) {
        setTasks((current) =>
            current.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
        );
    }

    function handleTaskCreated(task) {
        setTasks((current) => [...current, task]);
    }

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">
                    Tasks
                </Typography>

                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    {myTasks.canToggle && (
                        <MyCasesToggle
                            label="My tasks"
                            enabled={myTasks.enabled}
                            onChange={myTasks.setEnabled}
                        />
                    )}

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setAddTaskOpen(true)}
                    >
                        Add Task
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>
                    {error}
                </Alert>
            )}

            {loading && (
                <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            )}

            {!loading && visibleTasks.length === 0 && (
                <Typography color="text.secondary">
                    {tasks.length === 0 ? `No tasks for this ${noun} yet.` : `No tasks for this ${noun} are assigned to you.`}
                </Typography>
            )}

            {!loading && visibleTasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    titleOptions={titleOptions}
                    users={users}
                    onUpdate={handleTaskUpdate}
                />
            ))}

            <AddTaskDialog
                open={addTaskOpen}
                link={link}
                onClose={() => setAddTaskOpen(false)}
                onCreated={handleTaskCreated}
            />
        </Stack>
    );
}

export default TasksTab;
