import { useEffect, useState } from 'react';
import { Stack, CircularProgress, Alert } from '@mui/material';
import SectionCard from '../Common/SectionCard';
import ActivityFeedList from './ActivityFeedList';
import { getActivityForItem } from '../../services/ActivityLogService';

// Generic per-item history tab - not Cats-specific, takes whichever
// boardId/itemId the hosting workspace page passes in.
function ActivityTab({ boardId, itemId }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadActivity() {
            setLoading(true);
            setError(null);

            try {
                const data = await getActivityForItem(boardId, itemId);

                if (!cancelled) {
                    setEntries(data);
                }
            } catch (err) {
                console.error('Failed to load activity:', err);

                if (!cancelled) {
                    setError('Failed to load activity.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadActivity();

        return () => {
            cancelled = true;
        };
    }, [boardId, itemId]);

    return (
        <SectionCard title="Activity">
            {loading ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <ActivityFeedList entries={entries} />
            )}
        </SectionCard>
    );
}

export default ActivityTab;
