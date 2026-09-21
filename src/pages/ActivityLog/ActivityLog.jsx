import { useEffect, useState } from 'react';
import { Card, CardContent, Stack, CircularProgress, Alert } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import ActivityFeedList from '../../components/ActivityLog/ActivityFeedList';
import { getAllActivity } from '../../services/ActivityLogService';

function ActivityLog() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadActivity() {
            setLoading(true);
            setError(null);

            try {
                const data = await getAllActivity();

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
    }, []);

    return (
        <>
            <PageHeader title="Activity Log" subtitle="Everything that's happened across the app" />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            ) : (
                <Card>
                    <CardContent>
                        <ActivityFeedList entries={entries} showItemContext />
                    </CardContent>
                </Card>
            )}
        </>
    );
}

export default ActivityLog;
