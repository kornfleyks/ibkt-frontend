import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, Typography, Avatar, Stack, Box, Tabs, Tab, Chip, Divider } from '@mui/material';
import PetsIcon from '@mui/icons-material/PetsOutlined';
import PageHeader from '../../components/PageHeader';
import { getCat } from '../../services/CatsService';
import { useLoading } from '../../context/LoadingContext';
import OverviewTab from '../../components/Cats/Workspace/OverviewTab';
import MedicalTab from '../../components/Cats/Workspace/MedicalTab';
import DocumentsTab from '../../components/Cats/Workspace/DocumentsTab';
import TimelineTab from '../../components/Cats/Workspace/TimelineTab';
import InfoRow from '../../components/Common/InfoRow';
import { workspaceTabs } from '../../config/workspaceTabs';
import CommunicationsTab from '../../components/Cats/Workspace/Communications/CommunicationsTab';
import TasksTab from '../../components/Cats/Workspace/Tasks/TasksTab';

function CatWorkspace() {
    const { id } = useParams();
    const [cat, setCat] = useState(null);
    const [tab, setTab] = useState(0);
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

    const tabComponents = {
        0: <OverviewTab cat={cat} />,
        1: <MedicalTab cat={cat} />,
        2: <DocumentsTab cat={cat} />,
        3: <CommunicationsTab cat={cat} />,
        4: <TasksTab />,
        5: <Typography>Matching Coming Soon</Typography>,
        6: <Typography>Travel Coming Soon</Typography>,
        7: <Typography>Post Adoption Coming Soon</Typography>,
        8: <TimelineTab cat={cat} />
    };

    return (
        <>
            <PageHeader
                title={cat.name}
                subtitle={`${cat.gender} • ${cat.age}y • ${cat.country}`}
            />

            <Card>
                <CardContent>
                    <Stack direction="row" spacing={3}>
                        <Avatar sx={{ width: 80, height: 80 }}>
                            <PetsIcon />
                        </Avatar>

                        <Box flex={1}>
                            <Typography variant="h5" fontWeight={700}>
                                {cat.name}
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
                                <Chip label={cat.status} color="primary" size="small" />
                                <Chip label={cat.medicalStatus} color="success" size="small" />
                            </Stack>

                            <Divider sx={{ mb: 2 }} />

                            <Stack>
                                <InfoRow label="Rescuer" value={cat.rescuer} />
                                <InfoRow label="Country" value={cat.country} />
                                <InfoRow label="Age" value={`${cat.age} years`} />
                            </Stack>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            <Card sx={{ mt: 3 }}>
                <CardContent>
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
                <CardContent>
                    {tabComponents[tab]}
                </CardContent>
            </Card>
        </>
    );
}

export default CatWorkspace;