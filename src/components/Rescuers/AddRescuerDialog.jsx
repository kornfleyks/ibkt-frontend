import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Grid,
    TextField,
    MenuItem,
    Alert,
} from '@mui/material';
import { CloseIcon } from '../icons';
import PhoneField from '../Account/PhoneField';
import { addRescuer } from '../../services/RescuerApplicationService';
import { CONTACT_METHODS } from '../../constants/forms/rescuerApplicationForm';

const EMPTY = {
    firstName: '',
    lastName: '',
    email: '',
    phone: { country: 'GB', number: '' },
    whatsapp: '',
    country: '',
    city: '',
    contactMethod: '',
    notes: '',
};

// "Add Rescuer": an Admin creates a rescuer directly, skipping the
// application form and review. The Rescuers record and the login are made
// together and the rescuer is emailed a link to choose their password
// (server/rescuerOnboarding/). No agreement answers are recorded.
//
// Rendered only while open, like the other Users dialogs.
function AddRescuerDialog({ onClose, onCreated }) {
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
            const result = await addRescuer(form);

            onCreated?.({
                id: result.userId,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                role: 'Rescuer',
                accountStatus: 'Active',
                emailStatus: result.email,
            });
            onClose();
        } catch (err) {
            console.error('Failed to add the rescuer:', err);
            setError(err.message || 'Failed to add the rescuer.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>
                Add Rescue Partner
                <IconButton onClick={handleClose} disabled={saving} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                <Alert severity="info">
                    The rescue partner is created Active right away and emailed a link (valid for 7 days) to choose their
                    password. They have not answered the agreement questions, so none are recorded.
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
                        <TextField fullWidth size="small" label="WhatsApp number" disabled={saving} value={form.whatsapp} onChange={(event) => setField('whatsapp', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField select fullWidth size="small" label="Preferred contact method" disabled={saving} value={form.contactMethod} onChange={(event) => setField('contactMethod', event.target.value)}>
                            <MenuItem value="">-</MenuItem>
                            {CONTACT_METHODS.map((method) => (
                                <MenuItem key={method} value={method}>
                                    {method}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth size="small" label="Country" disabled={saving} value={form.country} onChange={(event) => setField('country', event.target.value)} />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField fullWidth size="small" label="City" disabled={saving} value={form.city} onChange={(event) => setField('city', event.target.value)} />
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
                    {saving ? 'Adding...' : 'Add Rescuer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddRescuerDialog;
