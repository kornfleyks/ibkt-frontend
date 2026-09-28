import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SectionCard from '../Common/SectionCard';
import { changeEmail } from '../../services/AccountService';
import useAuth from '../../hooks/useAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The email is the sign-in name, so changing it needs the current password.
function EmailChangeCard({ account, onChanged }) {
    const { updateSession } = useAuth();
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [changedTo, setChangedTo] = useState(null);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!EMAIL_PATTERN.test(newEmail.trim())) {
            setError('Enter a valid email address.');
            return;
        }

        if (!currentPassword) {
            setError('Enter your current password.');
            return;
        }

        setSaving(true);
        setError(null);
        setChangedTo(null);

        try {
            const { token, user, account: updated } = await changeEmail({ newEmail: newEmail.trim(), currentPassword });

            updateSession({ token, user });
            onChanged({ email: updated.email, emailVerified: updated.emailVerified });
            setChangedTo(updated.email);
            setNewEmail('');
            setCurrentPassword('');
        } catch (err) {
            setError(err.message || 'Failed to change your email.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <SectionCard title="Email address">
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                        You sign in with <strong>{account.email}</strong>. A new address is marked
                        as unverified, since no confirmation email can be sent yet.
                    </Typography>

                    {error && <Alert severity="error">{error}</Alert>}

                    {changedTo && (
                        <Alert severity="success" onClose={() => setChangedTo(null)}>
                            Your email is now {changedTo}. Use it the next time you sign in.
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        type="email"
                        label="New email"
                        value={newEmail}
                        disabled={saving}
                        onChange={(event) => setNewEmail(event.target.value)}
                        slotProps={{ htmlInput: { autoComplete: 'email' } }}
                    />

                    <TextField
                        fullWidth
                        type="password"
                        label="Current password"
                        value={currentPassword}
                        disabled={saving}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        slotProps={{ htmlInput: { autoComplete: 'current-password' } }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit" variant="contained" disabled={saving}>
                            {saving ? 'Changing...' : 'Change email'}
                        </Button>
                    </Box>
                </Stack>
            </Box>
        </SectionCard>
    );
}

export default EmailChangeCard;
