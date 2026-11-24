import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';

import PageHeader from '../../components/PageHeader';
import ShareCatFormButton from '../../components/CatForm/ShareCatFormButton';
import InviteCatFormButton from '../../components/CatForm/InviteCatFormButton';
import { getMyCats } from '../../services/RescuerPortalService';
import { PORTAL_CONTACT_EMAIL } from '../../constants/rescuerPortal';
import useDateFormat from '../../hooks/useDateFormat';

function plural(count, word) {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// The portal's home: the cats this rescuer has added, read-only. Nothing
// here can be edited - changes go through IBKT.
function RescuerCats() {
    const { formatDate } = useDateFormat();
    // e.g. "Mittens was added" after the Add Cat page.
    const notice = useLocation().state?.notice;

    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getMyCats();

                if (!cancelled) setCats(data);
            } catch (err) {
                console.error('Failed to load the cats:', err);

                if (!cancelled) setError(err.message || 'Failed to load your cats.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <>
            <PageHeader
                title="My Cats"
                subtitle="The cats you have added. To change anything, contact IBKT."
                actions={
                    <Stack direction="row" spacing={1}>
                        <InviteCatFormButton />
                        <ShareCatFormButton />
                        <Button variant="contained" component={RouterLink} to="/rescuer/add-cat">
                            Add Cat
                        </Button>
                    </Stack>
                }
            />

            {notice && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {notice}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            ) : cats.length === 0 && !error ? (
                <Typography color="text.secondary">You have not added any cats yet.</Typography>
            ) : (
                <Stack spacing={2}>
                    {cats.map((cat) => (
                        <Card key={cat.id}>
                            <CardContent>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="h6" component="h2">
                                        {cat.name}
                                    </Typography>

                                    <Chip label={cat.status || 'N/A'} size="small" />
                                </Stack>

                                <Typography variant="body2" color="text.secondary">
                                    Added {cat.addedAt ? formatDate(cat.addedAt) : 'N/A'}
                                </Typography>

                                <Typography variant="body2" color="text.secondary">
                                    {plural(cat.photoCount, 'photo')} - {plural(cat.videoCount, 'video')} - {plural(cat.documentCount, 'document')}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                Questions or changes: <a href={`mailto:${PORTAL_CONTACT_EMAIL}`}>{PORTAL_CONTACT_EMAIL}</a>
            </Typography>
        </>
    );
}

export default RescuerCats;
