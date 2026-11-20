import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Alert, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';

import PageHeader from '../../components/PageHeader';
import useAuth from '../../hooks/useAuth';
import { getMyFosterCats } from '../../services/FosterPortalService';
import { FOSTER_CONTACT_EMAIL } from '../../constants/fosterPortal';
import useDateFormat from '../../hooks/useDateFormat';

// How the newest profile of a cat is shown: [label, chip colour, what the
// button says, whether the foster can send one now].
function profileState(profile) {
    if (!profile) return { label: 'No profile sent yet', color: 'default', action: 'Send Kitty Profile', canSend: true };

    if (profile.status === 'Pending') return { label: 'Waiting for review', color: 'info', action: 'Waiting for review', canSend: false };
    if (profile.status === 'Applied') return { label: 'Added to the cat', color: 'success', action: 'Send an updated profile', canSend: true };

    return { label: 'Needs changes', color: 'warning', action: 'Send a new profile', canSend: true };
}

// The foster portal's home: the cats IBKT has placed with the foster, and the
// state of the Kitty Profile of each (docs/foster-onboarding.md).
function FosterCats() {
    const { user } = useAuth();
    const { formatDate } = useDateFormat();
    // e.g. "Your profile for Mittens was sent" after the profile page.
    const notice = useLocation().state?.notice;

    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getMyFosterCats();

                if (!cancelled) setCats(data);
            } catch (err) {
                console.error('Failed to load the foster cats:', err);

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
            <PageHeader title="My Foster Cats" subtitle={`Welcome, ${user?.firstName ?? ''}`.trim()} />

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
                <Typography color="text.secondary">IBKT has not placed a cat with you yet. When it does, the cat will be listed here.</Typography>
            ) : (
                <Stack spacing={2}>
                    {cats.map((cat) => {
                        const state = profileState(cat.profile);

                        return (
                            <Card key={cat.id}>
                                <CardContent>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}>
                                        <Typography variant="h6" component="h2">
                                            {cat.name}
                                        </Typography>

                                        <Chip label={state.label} color={state.color} size="small" />
                                    </Stack>

                                    {cat.profile?.submittedAt && (
                                        <Typography variant="body2" color="text.secondary">
                                            Profile sent {formatDate(cat.profile.submittedAt)}
                                        </Typography>
                                    )}

                                    {cat.profile?.status === 'Rejected' && cat.profile.rejectReason && (
                                        <Alert severity="warning" sx={{ mt: 1.5 }}>
                                            {cat.profile.rejectReason}
                                        </Alert>
                                    )}

                                    <Button
                                        component={RouterLink}
                                        to={`/foster/cats/${cat.id}/profile`}
                                        variant="contained"
                                        size="small"
                                        disabled={!state.canSend}
                                        sx={{ mt: 2 }}
                                    >
                                        {state.action}
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </Stack>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                Questions or changes: <a href={`mailto:${FOSTER_CONTACT_EMAIL}`}>{FOSTER_CONTACT_EMAIL}</a>
            </Typography>
        </>
    );
}

export default FosterCats;
