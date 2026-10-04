import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
    Button,
    Card,
    CardContent,
    Stack,
    Tabs,
    Tab,
    TextField,
    Typography
} from '@mui/material';

import { AddIcon } from '../components/icons';

import PageHeader from '../components/PageHeader';

import CatsGrid from '../components/Cats/CatsGrid';
import AddCatDialog from '../components/Cats/AddCatDialog/AddCatDialog';

import { getCats } from '../services/CatsService';
import { CATS_STATUS_OPTIONS } from '../constants/statuses/catsStatuses';
import { searchText } from '../utils/searchText';

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
    // Kept in the URL (?q=) so it survives a reload and can be linked to.
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get('q') ?? '';

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

    const searchIndex = useMemo(() => new Map(cats.map((cat) => [cat.id, searchText(cat)])), [cats]);
    const term = search.trim().toLowerCase();
    const matching = cats.filter((cat) => !term || searchIndex.get(cat.id)?.includes(term));
    const visibleCats = TABS[tab].status === null
        ? matching
        : matching.filter((cat) => cat.status === TABS[tab].status);



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
                <Stack spacing={2}>
                <Tabs
                    value={tab}
                    onChange={(event, newValue) => setTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {TABS.map((item) => (
                        <Tab
                            key={item.label}
                            label={`${item.label} (${(item.status === null ? matching : matching.filter((cat) => cat.status === item.status)).length})`}
                        />
                    ))}
                </Tabs>

                <TextField
                    id="cats-search"
                    size="small"
                    label="Search cats"
                    placeholder="Name, breed, colour, microchip, rescuer..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    sx={{ width: '100%', maxWidth: 420 }}
                />
                </Stack>
            </CardContent>
        </Card>

        {visibleCats.length === 0 ? (
            <Typography color="text.secondary">
                {term ? `No cats match "${search.trim()}".` : 'No cats in this status.'}
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
