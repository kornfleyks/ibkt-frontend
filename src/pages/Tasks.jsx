import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/AddOutlined';
import PageHeader from '../components/PageHeader';
import AddTaskDialog from '../components/Cats/Workspace/Tasks/AddTaskDialog';
import TaskCard from '../components/Cats/Workspace/Tasks/TaskCard';
import MyCasesToggle from '../components/Common/MyCasesToggle';
import { getTasks, getTaskTitleOptions } from '../services/TasksService';
import { getUsers } from '../services/UsersService';
import { useLoading } from '../context/LoadingContext';
import useTabParam from '../hooks/useTabParam';
import useMyCasesFilter from '../hooks/useMyCasesFilter';
import { isTaskOpen } from '../utils/taskStatus';
import { TASKS_STATUS_OPTIONS } from '../constants/statuses/tasksStatuses';

const { STATUS } = TASKS_STATUS_OPTIONS;

const TABS = [
    { label: 'Open', slug: 'open', matches: isTaskOpen, empty: 'No open tasks.' },
    { label: 'Completed', slug: 'completed', matches: (task) => task.status === STATUS.COMPLETED, empty: 'No completed tasks.' },
    { label: 'Cancelled', slug: 'cancelled', matches: (task) => task.status === STATUS.CANCELLED, empty: 'No cancelled tasks.' },
    { label: 'All', slug: 'all', matches: () => true, empty: 'No tasks yet.' },
];

function matchesSearch(task, term) {
    if (!term) {
        return true;
    }

    return [task.title, task.linkedCatName, task.ownerName]
        .some((value) => (value || '').toLowerCase().includes(term));
}

// Earliest due date first; tasks without a due date go last.
function byDueDate(a, b) {
    if (!a.dueDate && !b.dueDate) {
        return 0;
    }

    if (!a.dueDate) {
        return 1;
    }

    if (!b.dueDate) {
        return -1;
    }

    return a.dueDate.localeCompare(b.dueDate);
}

function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [titleOptions, setTitleOptions] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadError, setLoadError] = useState(null);
    // Kept in the URL (?q=) so global-search links can pre-fill it, even when
    // this page is already open.
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get('q') ?? '';
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [tab, setTab] = useTabParam(TABS);
    const myTasks = useMyCasesFilter('tasks', 'ownerId');
    const { showLoading, hideLoading } = useLoading();

    useEffect(() => {
        showLoading('Loading tasks...');

        getTasks()
            .then((data) => {
                setLoadError(null);
                setTasks(data);
            })
            .catch((err) => {
                console.error('Failed to load tasks:', err);
                setLoadError('Failed to load tasks.');
            })
            .finally(hideLoading);

        // Only needed when a card is edited - a failure just leaves those
        // pickers empty, same as the cat Tasks tab.
        getTaskTitleOptions()
            .then(setTitleOptions)
            .catch((err) => console.error('Failed to load task title options:', err));

        getUsers()
            .then(setUsers)
            .catch((err) => console.error('Failed to load users:', err));
    }, []);

    function setSearch(value) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);

            if (value) {
                next.set('q', value);
            } else {
                next.delete('q');
            }

            return next;
        }, { replace: true });
    }

    function handleTaskUpdate(taskId, updates) {
        setTasks((current) =>
            current.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
        );
    }

    function handleTaskCreated(task) {
        if (task) {
            setTasks((current) => [...current, task]);
        }
    }

    const term = search.trim().toLowerCase();
    const filteredTasks = myTasks.filter(tasks).filter((task) => matchesSearch(task, term));
    const visibleTasks = filteredTasks.filter(TABS[tab].matches).sort(byDueDate);

    return (
        <>
            <PageHeader
                title="Tasks"
                subtitle="Manage tasks"
                actions={
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <MyCasesToggle
                            label="My tasks"
                            enabled={myTasks.enabled}
                            onChange={myTasks.setEnabled}
                        />

                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            sx={{ minWidth: 140 }}
                            onClick={() => setAddTaskOpen(true)}
                        >
                            Add Task
                        </Button>
                    </Stack>
                }
            />

            {loadError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {loadError}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={2}>
                        <Tabs
                            value={tab}
                            onChange={(event, newValue) => setTab(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {TABS.map((item) => (
                                <Tab
                                    key={item.slug}
                                    label={`${item.label} (${filteredTasks.filter(item.matches).length})`}
                                />
                            ))}
                        </Tabs>

                        <TextField
                            size="small"
                            label="Search by task, cat or owner"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            sx={{ maxWidth: 360 }}
                        />
                    </Stack>
                </CardContent>
            </Card>

            {visibleTasks.length === 0 ? (
                <Typography color="text.secondary">
                    {term ? `No tasks match "${search.trim()}".` : TABS[tab].empty}
                </Typography>
            ) : (
                <Stack spacing={2}>
                    {visibleTasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            titleOptions={titleOptions}
                            users={users}
                            onUpdate={handleTaskUpdate}
                            showCat
                            highlightOverdue
                        />
                    ))}
                </Stack>
            )}

            {/* No catId, so the dialog shows its own cat picker (same as the
                Dashboard's Create Task). */}
            <AddTaskDialog
                open={addTaskOpen}
                onClose={() => setAddTaskOpen(false)}
                onCreated={handleTaskCreated}
            />
        </>
    );
}

export default Tasks;
