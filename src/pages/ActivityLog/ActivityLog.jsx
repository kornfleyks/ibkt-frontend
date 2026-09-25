import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Stack, CircularProgress, Alert, TextField, InputAdornment } from '@mui/material';
import { SearchIcon } from '../../components/icons';
import PageHeader from '../../components/PageHeader';
import ActivityFeedList from '../../components/ActivityLog/ActivityFeedList';
import { getAllActivity } from '../../services/ActivityLogService';

function matchesSearch(entry, term) {
    const haystack = [
        entry.description,
        entry.actorName,
        entry.board,
        entry.itemName,
        entry.actionType,
    ]
        .join(' ')
        .toLowerCase();

    return haystack.includes(term);
}

function ActivityLog() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

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

    const filteredEntries = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return entries;
        }

        return entries.filter((entry) => matchesSearch(entry, term));
    }, [entries, search]);

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
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search activity by person, item, board, or action..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            sx={{ mb: 2 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" color="disabled" />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        <ActivityFeedList
                            entries={filteredEntries}
                            showItemContext
                            emptyMessage={
                                search.trim()
                                    ? 'No activity matches your search.'
                                    : 'No activity recorded yet.'
                            }
                        />
                    </CardContent>
                </Card>
            )}
        </>
    );
}

export default ActivityLog;
