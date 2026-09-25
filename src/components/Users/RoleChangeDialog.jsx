import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { updateUserRole } from '../../services/UsersService';

// Confirms a role change before it's saved; the new role applies to that
// person on their next request (the server reads the live role).
function RoleChangeDialog({ user, newRole, onClose, onChanged }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function handleConfirm() {
        setSaving(true);
        setError(null);

        try {
            await updateUserRole(user.id, newRole);
            onChanged(user.id, { role: newRole });
        } catch (err) {
            console.error('Failed to update role:', err);
            setError(err.message || 'Failed to update role.');
            setSaving(false);
        }
    }

    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;

    return (
        <Dialog open onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
            <DialogTitle>Change role?</DialogTitle>

            <DialogContent>
                <DialogContentText>
                    <strong>{name}</strong> will change from <strong>{user.role || 'no role'}</strong> to{' '}
                    <strong>{newRole}</strong>. What they can see and do changes on their next action in the app.
                </DialogContentText>

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

                <Button variant="contained" onClick={handleConfirm} disabled={saving}>
                    {saving ? 'Saving...' : 'Change role'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default RoleChangeDialog;
