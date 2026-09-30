import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SectionCard from '../Common/SectionCard';
import { changePassword } from '../../services/AccountService';
import useAuth from '../../hooks/useAuth';

const MIN_PASSWORD_LENGTH = 8;

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

function validate(form) {
    if (!form.currentPassword) {
        return 'Enter your current password.';
    }

    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
        return `The new password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (form.newPassword !== form.confirmPassword) {
        return 'The new passwords do not match.';
    }

    if (form.newPassword === form.currentPassword) {
        return 'The new password must be different from the current one.';
    }

    return null;
}

function PasswordChangeCard() {
    const { updateSession } = useAuth();
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [changed, setChanged] = useState(false);

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const validationError = validate(form);

        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError(null);
        setChanged(false);

        try {
            const { token } = await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });

            // Sessions made with the old password are refused from now on -
            // this device continues on the re-issued token.
            updateSession({ token });
            setForm(EMPTY_FORM);
            setChanged(true);
        } catch (err) {
            setError(err.message || 'Failed to change your password.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <SectionCard title="Password">
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        Changing your password signs you out on every other device. You stay signed in here.
                    </Typography>

                    {error && <Alert severity="error">{error}</Alert>}

                    {changed && (
                        <Alert severity="success" onClose={() => setChanged(false)}>
                            Your password was changed. Other devices have been signed out.
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        type="password"
                        label="Current password"
                        value={form.currentPassword}
                        disabled={saving}
                        onChange={(event) => setField('currentPassword', event.target.value)}
                        slotProps={{ htmlInput: { autoComplete: 'current-password' } }}
                    />

                    <TextField
                        fullWidth
                        type="password"
                        label="New password"
                        value={form.newPassword}
                        disabled={saving}
                        onChange={(event) => setField('newPassword', event.target.value)}
                        helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
                        slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
                    />

                    <TextField
                        fullWidth
                        type="password"
                        label="Confirm new password"
                        value={form.confirmPassword}
                        disabled={saving}
                        onChange={(event) => setField('confirmPassword', event.target.value)}
                        slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" disabled={saving}>
                            {saving ? 'Changing...' : 'Change password'}
                        </Button>
                    </Box>
                </Stack>
            </Box>
        </SectionCard>
    );
}

export default PasswordChangeCard;
