import {
    Card,
    CardContent,
    Stack,
    Typography,
    Chip,
    Checkbox,
    Box
} from '@mui/material';

function getStatusColor(status) {
    switch (status) {
        case 'Completed':
            return 'success';

        case 'Pending':
            return 'warning';

        case 'Open':
            return 'info';

        case 'Overdue':
            return 'error';

        default:
            return 'default';
    }
}

function TaskCard({ task, onToggle }) {
    const isCompleted = task.status === 'Completed';

    return (
        <Card variant="outlined">
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Checkbox
                        checked={isCompleted}
                        onChange={() => onToggle(task.id)}
                    />

                    <Box flex={1}>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            spacing={2}
                        >
                            <Typography
                                fontWeight={600}
                                sx={{
                                    textDecoration: isCompleted ? 'line-through' : 'none'
                                }}
                            >
                                {task.title}
                            </Typography>

                            <Chip
                                label={task.status}
                                size="small"
                                color={getStatusColor(task.status)}
                            />
                        </Stack>

                        <Typography variant="body2" color="text.secondary">
                            Assignee: {task.assignee}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default TaskCard;