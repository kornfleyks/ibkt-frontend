import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useTabParam from '../../hooks/useTabParam';
import {
    Card,
    CardContent,
    Typography,
    Avatar,
    Stack,
    Box,
    Tabs,
    Tab,
    Chip,
    Divider,
    TextField,
    MenuItem,
    IconButton,
    CircularProgress,
} from '@mui/material';
import { PetsIcon, EditIcon, CheckIcon, CloseIcon } from '../../components/icons';
import PageHeader from '../../components/PageHeader';
import { getCat, updateCatStatus } from '../../services/CatsService';
import { useLoading } from '../../context/LoadingContext';
import OverviewTab from '../../components/Cats/Workspace/OverviewTab';
import MedicalTab from '../../components/Cats/Workspace/MedicalTab';
import DocumentsTab from '../../components/Cats/Workspace/DocumentsTab';
import InfoRow from '../../components/Common/InfoRow';
import { workspaceTabs } from '../../config/workspaceTabs';
import CommunicationsTab from '../../components/Communications/CommunicationsTab';
import TasksTab from '../../components/Cats/Workspace/Tasks/TasksTab';
import ActivityTab from '../../components/ActivityLog/ActivityTab';
import { CATS_STATUS_OPTIONS } from '../../constants/statuses/catsStatuses';
import { CATS } from '../../constants/boards/cats';

const STATUS_OPTIONS = Object.values(CATS_STATUS_OPTIONS.STATUS);

function StatusChipEditor({ cat, onCatUpdate }) {
    const [editing, setEditing] = useState(false);
    const [status, setStatus] = useState(cat.status);
    const [saving, setSaving] = useState(false);

    function startEditing() {
        setStatus(cat.status);
        setEditing(true);
    }

    async function handleSave() {
        setSaving(true);

        try {
            await updateCatStatus(cat.id, status);
            onCatUpdate({ status });
            setEditing(false);
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <Chip label={cat.status} color="primary" size="small" />

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit status"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    return (
        <Stack direction="row" alignItems="center" spacing={0.5}>
            <TextField
                select
                size="small"
                sx={{ minWidth: 170 }}
                disabled={saving}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
            >
                {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                        {option}
                    </MenuItem>
                ))}
            </TextField>

            <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save status">
                {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
            </IconButton>

            <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                <CloseIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}

function CatWorkspace() {
    const { id } = useParams();
    const [cat, setCat] = useState(null);
    const [tab, setTab] = useTabParam(workspaceTabs);
    const { showLoading, hideLoading } = useLoading();

    async function loadCat() {
        showLoading('Loading cat...');
        try {
            const data = await getCat(id);
            setCat(data);
        } finally {
            hideLoading();
        }
    }

    useEffect(() => {
        loadCat();
    }, [id]);



    if (!cat) {
        return null;
    }

    function handleCatUpdate(updates) {
        setCat((current) => ({ ...current, ...updates }));
    }

    const tabComponents = {
        overview: <OverviewTab cat={cat} onCatUpdate={handleCatUpdate} />,
        medical: <MedicalTab cat={cat} onCatUpdate={handleCatUpdate} />,
        documents: <DocumentsTab cat={cat} onCatUpdate={handleCatUpdate} />,
        communications: <CommunicationsTab boardId={CATS.BOARD_ID} itemId={cat.id} />,
        tasks: <TasksTab cat={cat} />,
        travel: <Typography>Travel Coming Soon</Typography>,
        'post-adoption': <Typography>Post Adoption Coming Soon</Typography>,
        activity: <ActivityTab boardId={CATS.BOARD_ID} itemId={cat.id} />
    };

    return (
        <>
            <PageHeader
                title={cat.name}
                subtitle={`${cat.gender} • ${cat.age}y`}
            />

            <Card>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" spacing={3}>
                        <Avatar sx={{ width: 80, height: 80 }}>
                            <PetsIcon />
                        </Avatar>

                        <Box flex={1}>
                            <Typography variant="h5" fontWeight={700}>
                                {cat.name}
                            </Typography>

                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 2 }}>
                                <StatusChipEditor cat={cat} onCatUpdate={handleCatUpdate} />
                                <Chip label={`FeLV/FIV: ${cat.felvFivStatus}`} color="success" size="small" />
                            </Stack>

                            <Divider sx={{ mb: 2 }} />

                            <Stack>
                                <InfoRow label="Rescuer" value={cat.rescuer} />
                                <InfoRow label="Age" value={`${cat.age} years`} />
                            </Stack>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    <Tabs
                        value={tab}
                        onChange={(event, newValue) => setTab(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {workspaceTabs.map(item => (
                            <Tab key={item.label} label={item.label} />
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    {tabComponents[workspaceTabs[tab].slug]}
                </CardContent>
            </Card>
        </>
    );
}

export default CatWorkspace;