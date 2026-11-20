import { useEffect, useState } from 'react';
import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import SectionCard from '../../Common/SectionCard';
import { ProfileDialog, ApplyDialog, RejectDialog } from './FosterProfileDialogs';
import { getFosterProfiles } from '../../../services/FosterReviewService';
import { getCat } from '../../../services/CatsService';
import useDateFormat from '../../../hooks/useDateFormat';

const STATUS_COLORS = { Pending: 'warning', Applied: 'success', Rejected: 'default' };

// The Kitty Profiles a foster sent for this cat (docs/foster-onboarding.md): read
// them, apply them to the cat or send them back. Shown only when the cat has
// any, at the top of the Overview tab. `onCatUpdate` gets the cat as it is after
// an Apply (its fields and its files).
function FosterProfilesCard({ cat, onCatUpdate }) {
    const { formatDateTime } = useDateFormat();
    const [profiles, setProfiles] = useState([]);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    // { kind: 'view' | 'apply' | 'reject', profile }
    const [open, setOpen] = useState(null);

    // Bumped to read the profiles again (after an Apply or a Send back).
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        getFosterProfiles(cat.id)
            .then((list) => {
                if (cancelled) return;

                setProfiles(list);
                setError(null);
            })
            .catch((err) => {
                // The server answers 409 when fosters are not kept in the database: nothing to show then.
                console.error('Failed to load the foster profiles:', err);

                if (!cancelled) setError(err.status === 409 ? null : err.message || 'Failed to load the foster profiles.');
            });

        return () => {
            cancelled = true;
        };
    }, [cat.id, reloadKey]);

    async function handleApplied(result, fields) {
        setOpen(null);
        setNotice(`Applied: ${result.applied.length} cat ${result.applied.length === 1 ? 'field' : 'fields'} and ${result.files} ${result.files === 1 ? 'file' : 'files'}.`);

        // The files changed too, so read the cat again.
        try {
            onCatUpdate(await getCat(cat.id));
        } catch (err) {
            console.error('Failed to refresh the cat:', err);
            onCatUpdate(fields);
        }

        setReloadKey((key) => key + 1);
    }

    function handleRejected() {
        setOpen(null);
        setNotice('The profile was sent back to the foster.');
        setReloadKey((key) => key + 1);
    }

    if (profiles.length === 0 && !error) return null;

    return (
        <SectionCard title="Foster submissions" sx={{ mb: 3 }}>
            <Stack spacing={1.5}>
                {error && <Alert severity="error">{error}</Alert>}
                {notice && <Alert severity="success">{notice}</Alert>}

                {profiles.map((profile) => (
                    <Stack key={profile.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                        <Chip label={profile.status === 'Rejected' ? 'Sent back' : profile.status} color={STATUS_COLORS[profile.status] ?? 'default'} size="small" />

                        <Typography sx={{ flex: 1, minWidth: 200 }}>
                            Kitty Profile from {profile.fosterName}, sent {profile.submittedAt ? formatDateTime(profile.submittedAt) : 'N/A'}
                            {profile.status !== 'Pending' && profile.reviewedByName ? ` - ${profile.status === 'Applied' ? 'applied' : 'sent back'} by ${profile.reviewedByName}` : ''}
                        </Typography>

                        <Button size="small" variant={profile.status === 'Pending' ? 'contained' : 'outlined'} onClick={() => setOpen({ kind: 'view', profile })}>
                            {profile.status === 'Pending' ? 'Review' : 'View'}
                        </Button>
                    </Stack>
                ))}
            </Stack>

            {open?.kind === 'view' && (
                <ProfileDialog
                    profile={open.profile}
                    onClose={() => setOpen(null)}
                    onApply={() => setOpen({ kind: 'apply', profile: open.profile })}
                    onReject={() => setOpen({ kind: 'reject', profile: open.profile })}
                />
            )}

            {open?.kind === 'apply' && <ApplyDialog catId={cat.id} profile={open.profile} onClose={() => setOpen({ kind: 'view', profile: open.profile })} onApplied={handleApplied} />}

            {open?.kind === 'reject' && <RejectDialog catId={cat.id} profile={open.profile} onClose={() => setOpen({ kind: 'view', profile: open.profile })} onRejected={handleRejected} />}
        </SectionCard>
    );
}

export default FosterProfilesCard;
