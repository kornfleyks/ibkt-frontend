import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { groupProblems } from '../../../constants/catReadiness';

// "This cat is not ready for Adoption Ready": what is missing and, for an
// Admin, a reason field to set the status anyway (logged in the Activity Log).
// `onOverride(reason)` should throw to keep the dialog open with its message.
function AdoptionReadyDialog({ open, catName, problems, canOverride, onCancel, onOverride }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function handleOverride() {
        setSaving(true);
        setError(null);

        try {
            await onOverride(reason.trim());
            setReason('');
        } catch (err) {
            setError(err?.message || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setReason('');
        setError(null);
        onCancel();
    }

    return (
        <Dialog open={open} onClose={saving ? undefined : handleCancel} maxWidth="sm" fullWidth>
            <DialogTitle>{`${catName || 'This cat'} is not ready to be set to Adoption Ready`}</DialogTitle>

            <DialogContent dividers>
                <Typography sx={{ mb: 2 }}>These are still missing:</Typography>

                <Stack spacing={1.5}>
                    {groupProblems(problems).map(({ group, items }) => (
                        <Box key={group}>
                            <Typography variant="subtitle2">{group}</Typography>
                            <Box component="ul" sx={{ m: 0, pl: 3 }}>
                                {items.map((item) => (
                                    <li key={item.key}>
                                        <Typography variant="body2">{item.detail ? `${item.label} (${item.detail})` : item.label}</Typography>
                                    </li>
                                ))}
                            </Box>
                        </Box>
                    ))}
                </Stack>

                {canOverride ? (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            As an Admin you can set it anyway. Give a reason: it is saved in the Activity Log.
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="Reason"
                            value={reason}
                            disabled={saving}
                            onChange={(event) => setReason(event.target.value)}
                            slotProps={{ htmlInput: { maxLength: 500 } }}
                        />
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                        Add the missing details on the cat's pages, then try again. An Admin can set it anyway if something is genuinely not available.
                    </Typography>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleCancel} disabled={saving}>
                    {canOverride ? 'Cancel' : 'Close'}
                </Button>

                {canOverride && (
                    <Button variant="contained" color="warning" onClick={handleOverride} disabled={saving || !reason.trim()}>
                        {saving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : 'Set anyway'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default AdoptionReadyDialog;
