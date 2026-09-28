import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import SectionCard from '../Common/SectionCard';
import InfoRow from '../Common/InfoRow';
import PhoneField from './PhoneField';
import { formatPhone, toPhoneForm } from '../../utils/phone';
import { updateProfile } from '../../services/AccountService';
import useAuth from '../../hooks/useAuth';
import useDateFormat from '../../hooks/useDateFormat';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

const PHONE_DIGITS = /^\d{4,15}$/;

function formFrom(account) {
    return {
        firstName: account.firstName,
        lastName: account.lastName,
        phone: toPhoneForm(account.phone),
    };
}

function validate(form) {
    if (!form.firstName.trim() || !form.lastName.trim()) {
        return 'First and last name are required.';
    }

    const number = form.phone.number.replace(/[\s\-().]/g, '');

    if (number && !form.phone.country) {
        return "Choose the phone number's country.";
    }

    if (number && !PHONE_DIGITS.test(number)) {
        return 'Enter a valid phone number (digits only, without the country code).';
    }

    return null;
}

// Name and phone (editable) plus the read-only account facts. Email and
// password have their own cards - both need the current password.
function ProfileDetailsCard({ account, onSaved }) {
    const { updateSession } = useAuth();
    const { formatDateTime } = useDateFormat();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(() => formFrom(account));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);

    function startEditing() {
        setForm(formFrom(account));
        setError(null);
        setSaved(false);
        setEditing(true);
    }

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSave(event) {
        event.preventDefault();

        const validationError = validate(form);

        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { token, user, phone } = await updateProfile(form);

            updateSession({ token, user });
            onSaved({ firstName: user.firstName, lastName: user.lastName, phone });
            setEditing(false);
            setSaved(true);
        } catch (err) {
            setError(err.message || 'Failed to save your profile.');
        } finally {
            setSaving(false);
        }
    }

    const verified = account.emailVerified === USERS_STATUS_OPTIONS.EMAIL_VERIFIED.YES;

    if (editing) {
        return (
            <SectionCard title="Profile">
                <Box component="form" onSubmit={handleSave} noValidate>
                    <Stack spacing={2}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                required
                                label="First name"
                                value={form.firstName}
                                disabled={saving}
                                onChange={(event) => setField('firstName', event.target.value)}
                                slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'given-name' } }}
                            />

                            <TextField
                                fullWidth
                                required
                                label="Last name"
                                value={form.lastName}
                                disabled={saving}
                                onChange={(event) => setField('lastName', event.target.value)}
                                slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'family-name' } }}
                            />
                        </Stack>

                        <PhoneField
                            value={form.phone}
                            disabled={saving}
                            onChange={(phone) => setField('phone', phone)}
                        />

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button onClick={() => setEditing(false)} disabled={saving}>
                                Cancel
                            </Button>

                            <Button type="submit" variant="contained" disabled={saving}>
                                {saving ? 'Saving...' : 'Save'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </SectionCard>
        );
    }

    return (
        <SectionCard title="Profile">
            {saved && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
                    Your profile was saved.
                </Alert>
            )}

            <InfoRow label="Name" value={`${account.firstName} ${account.lastName}`.trim()} labelWidth={140} />
            <InfoRow label="Phone" value={formatPhone(account.phone) || '—'} labelWidth={140} />
            <InfoRow
                label="Email"
                labelWidth={140}
                value={
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{account.email}</span>
                        <Chip
                            size="small"
                            variant="outlined"
                            color={verified ? 'success' : 'default'}
                            label={verified ? 'Verified' : 'Unverified'}
                        />
                    </Stack>
                }
            />
            <InfoRow label="Role" value={account.role} labelWidth={140} />
            <InfoRow label="Account status" value={account.accountStatus} labelWidth={140} />
            <InfoRow
                label="Latest sign-in"
                value={account.lastLogin ? formatDateTime(account.lastLogin) : 'Never'}
                labelWidth={140}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={startEditing}>
                    Edit profile
                </Button>
            </Box>
        </SectionCard>
    );
}

export default ProfileDetailsCard;
