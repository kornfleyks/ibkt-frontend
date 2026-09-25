import { useEffect, useState } from 'react';

import {
    Stack,
    Typography,
    Button,
    Box,
    Alert,
    CircularProgress
} from '@mui/material';

import { AddIcon } from '../../../icons';

import TaskCard from './TaskCard';
import AddTaskDialog from './AddTaskDialog';
import { getCatTasks, getTaskTitleOptions } from '../../../../services/TasksService';
import { getUsers } from '../../../../services/UsersService';
import MyCasesToggle from '../../../Common/MyCasesToggle';
import useMyCasesFilter from '../../../../hooks/useMyCasesFilter';

function TasksTab({ cat }) {
    const [tasks, setTasks] = useState([]);
    const [titleOptions, setTitleOptions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const myTasks = useMyCasesFilter('catTasks', 'ownerId');

    useEffect(() => {
        let cancelled = false;

        async function loadTasks() {
            setLoading(true);
            setError(null);

            try {
                const data = await getCatTasks(cat.id);

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

    }, [cat.id]);

    useEffect(() => {

        getTaskTitleOptions()
            .then(setTitleOptions)
            .catch((err) => console.error('Failed to load task title options:', err));

        getUsers()
            .then(setUsers)
            .catch((err) => console.error('Failed to load users:', err));

    }, []);

    // Same owner rule as the Tasks page: non-Admins only see tasks assigned
    // to them; Admins see all, with a "My tasks" toggle remembered per page.
    const visibleTasks = myTasks.filter(tasks);

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
                    {tasks.length === 0 ? 'No tasks for this cat yet.' : 'No tasks for this cat are assigned to you.'}
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
                catId={cat.id}
                onClose={() => setAddTaskOpen(false)}
                onCreated={handleTaskCreated}
            />
        </Stack>
    );
}

export default TasksTab;
