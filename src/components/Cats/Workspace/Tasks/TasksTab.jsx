import { useEffect, useState } from 'react';

import {
    Stack,
    Typography,
    Button,
    Box,
    Alert
} from '@mui/material';

import AddIcon from '@mui/icons-material/AddOutlined';

import TaskCard from './TaskCard';
import AddTaskDialog from './AddTaskDialog';
import { getCatTasks, getTaskTitleOptions } from '../../../../services/TasksService';
import { getUsers } from '../../../../services/UsersService';

function TasksTab({ cat }) {
    const [tasks, setTasks] = useState([]);
    const [titleOptions, setTitleOptions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addTaskOpen, setAddTaskOpen] = useState(false);

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
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                    Tasks
                </Typography>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddTaskOpen(true)}
                >
                    Add Task
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>
                    {error}
                </Alert>
            )}

            {!loading && tasks.length === 0 && (
                <Typography color="text.secondary">
                    No tasks for this cat yet.
                </Typography>
            )}

            {tasks.map((task) => (
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
