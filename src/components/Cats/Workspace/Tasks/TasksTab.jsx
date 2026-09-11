import { useState } from 'react';

import {
    Stack,
    Typography,
    Button,
    Box
} from '@mui/material';

import AddIcon from '@mui/icons-material/AddOutlined';

import mockTasks from './mockTasks';
import TaskCard from './TaskCard';

function TasksTab() {
    const [tasks, setTasks] = useState(mockTasks);

    const handleToggleTask = (taskId) => {
        setTasks((prevTasks) =>
            prevTasks.map((task) =>
                task.id === taskId
                    ? {
                        ...task,
                        status: task.status === 'Completed' ? 'Open' : 'Completed'
                    }
                    : task
            )
        );
    };

    return (
        <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                    Tasks
                </Typography>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    disabled
                >
                    Add Task
                </Button>
            </Box>

            {tasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                />
            ))}
        </Stack>
    );
}

export default TasksTab;