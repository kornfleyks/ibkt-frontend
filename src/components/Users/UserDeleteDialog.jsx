import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { getUserOpenWork, deleteUser } from '../../services/UsersService';
import OpenWorkSummary from './OpenWorkSummary';

// Permanent - unlike Suspend/Archive there's no later "Restore". Any open
// cases/tasks are always checked and handed to the caller (server/userAdmin.js
// does the same reassignment Suspend/Archive does), regardless of the
// account's current status.
function UserDeleteDialog({ user, onClose, onDeleted }) {
    const [work, setWork] = useState(null);
    const [workError, setWorkError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        getUserOpenWork(user.id)
            .then((data) => {
                if (!cancelled) {
                    setWork(data);
                }
            })
            .catch((err) => {
                console.error('Failed to load open work:', err);

                if (!cancelled) {
                    setWorkError("Couldn't check this user's open cases and tasks. They'll still be reassigned when you confirm.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [user.id]);

    async function handleConfirm() {
        setSaving(true);
        setError(null);

        try {
            const result = await deleteUser(user.id);
            onDeleted(user.id, result);
        } catch (err) {
            console.error('Failed to delete account:', err);
            setError(err.message || 'Failed to delete the account.');
            setSaving(false);
        }
    }

    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const loadingWork = !work && !workError;

    return (
        <Dialog open onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
            <DialogTitle>Delete this account?</DialogTitle>

            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    <strong>{name}</strong> ({user.email}) will be permanently deleted from Monday and the
                    database. This can't be undone.
                </DialogContentText>

                {loadingWork ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                            Checking their open cases and tasks...
                        </Typography>
                    </Box>
                ) : workError ? (
                    <Alert severity="info">{workError}</Alert>
                ) : (
                    <OpenWorkSummary work={work} />
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>

                <Button variant="contained" color="error" onClick={handleConfirm} disabled={saving || loadingWork}>
                    {saving ? 'Deleting...' : 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default UserDeleteDialog;
