import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Grid, TextField, Alert } from '@mui/material';
import { CloseIcon } from '../icons';
import PhoneField from '../Account/PhoneField';
import { addFoster } from '../../services/FosterApplicationService';

const EMPTY = {
    firstName: '',
    lastName: '',
    email: '',
    phone: { country: 'GB', number: '' },
    country: '',
    city: '',
    address: '',
    notes: '',
};

// "Add Foster": an Admin creates a foster directly, skipping the application
// form and review. The Fosters record and the login are made together and the
// foster is emailed a link to choose their password (server/fosterOnboarding/).
// No agreement is recorded.
//
// Rendered only while open, like the other Users dialogs.
function AddFosterDialog({ onClose, onCreated }) {
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleClose() {
        if (!saving) onClose();
    }

    async function handleSubmit() {
        if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
            setError('First name, last name and email are required.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const result = await addFoster(form);

            onCreated?.({
                id: result.userId,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                role: 'Foster',
                accountStatus: 'Active',
                emailStatus: result.email,
            });
            onClose();
        } catch (err) {
            console.error('Failed to add the foster:', err);
            setError(err.message || 'Failed to add the foster.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>
                Add Foster
                <IconButton onClick={handleClose} disabled={saving} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                <Alert severity="info">
                    The foster is created Active right away and emailed a link (valid for 7 days) to choose their password. They have not answered the
                    foster agreement, so none is recorded.
                </Alert>

                <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth size="small" required label="First Name" disabled={saving} value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth size="small" required label="Last Name" disabled={saving} value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField fullWidth size="small" required type="email" label="Email" disabled={saving} value={form.email} onChange={(event) => setField('email', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <PhoneField value={form.phone} onChange={(phone) => setField('phone', phone)} disabled={saving} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth size="small" label="Country" disabled={saving} value={form.country} onChange={(event) => setField('country', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth size="small" label="City" disabled={saving} value={form.city} onChange={(event) => setField('city', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField fullWidth multiline minRows={2} size="small" label="Address" disabled={saving} value={form.address} onChange={(event) => setField('address', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField fullWidth multiline minRows={2} size="small" label="Notes" disabled={saving} value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
                    </Grid>
                </Grid>

                {error && (
                    <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={handleClose} disabled={saving}>
                    Cancel
                </Button>

                <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Adding...' : 'Add Foster'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddFosterDialog;
