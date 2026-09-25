import { useEffect, useState } from 'react';

import {
    Button,
    Card,
    CardContent,
    Tabs,
    Tab,
    Typography
} from '@mui/material';

import { AddIcon } from '../components/icons';

import PageHeader from '../components/PageHeader';

import CatsGrid from '../components/Cats/CatsGrid';
import AddCatDialog from '../components/Cats/AddCatDialog/AddCatDialog';

import { getCats } from '../services/CatsService';
import { CATS_STATUS_OPTIONS } from '../constants/statuses/catsStatuses';

import { useLoading } from '../context/LoadingContext';
import useTabParam from '../hooks/useTabParam';
import { slugify } from '../utils/slugify';

const TABS = [
    { label: 'All', slug: 'all', status: null },
    ...Object.values(CATS_STATUS_OPTIONS.STATUS).map((status) => ({
        label: status,
        slug: slugify(status),
        status,
    })),
];

function Cats() {

    const [cats, setCats] = useState([]);
    const [addCatOpen, setAddCatOpen] = useState(false);
    const [tab, setTab] = useTabParam(TABS);

    const {
        showLoading,
        hideLoading
    } = useLoading();

    async function loadCats() {

        showLoading('Loading cats...');

        try {

            const data = await getCats();

            setCats(data);

        }

        finally {

            hideLoading();

        }

    }



    useEffect(() => {

        loadCats();

    }, []);

    const visibleCats = TABS[tab].status === null
        ? cats
        : cats.filter((cat) => cat.status === TABS[tab].status);



    return (

        <>

        <PageHeader

            title="Cats"

            subtitle="Manage rescue cats"


            actions={

                <Button

                    variant="contained"

                    startIcon={<AddIcon />}

                    onClick={() => setAddCatOpen(true)}

                    sx={{

                        minWidth: 140

                    }}

                >

                    Add Cat

                </Button>

            }

        />

        <Card sx={{ mb: 3 }}>
            <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Tabs
                    value={tab}
                    onChange={(event, newValue) => setTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {TABS.map((item) => (
                        <Tab key={item.label} label={item.label} />
                    ))}
                </Tabs>
            </CardContent>
        </Card>

        {visibleCats.length === 0 ? (
            <Typography color="text.secondary">
                No cats in this status.
            </Typography>
        ) : (
            <CatsGrid

                cats={visibleCats}

            />
        )}

            <AddCatDialog

                open={addCatOpen}

                onClose={() => setAddCatOpen(false)}

                onCreated={loadCats}

            />

        </>

    );

}


export default Cats;