import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    InputAdornment,
    Grid,
    TextField,
    MenuItem,
    Alert,
} from '@mui/material';
import { CloseIcon, CheckIcon, ContentCopyIcon } from '../icons';
import { createUser } from '../../services/UsersService';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

// Super Admin is never picked here either - see Users.jsx's ROLE_OPTIONS.
const ROLE_OPTIONS = Object.values(USERS_STATUS_OPTIONS.ROLE).filter(
    (role) => role !== USERS_STATUS_OPTIONS.ROLE.SUPER_ADMIN,
);

// No 0/O/1/I/l - a password the admin may have to read out loud or retype
// shouldn't hinge on telling those apart.
const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generatePassword(length = 14) {
    const values = crypto.getRandomValues(new Uint32Array(length));

    return Array.from(values, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join('');
}

function initialForm() {
    return { firstName: '', lastName: '', email: '', role: '', password: generatePassword() };
}

// Creates the account Active right away (no approval queue - an Admin
// already decided). The password is generated here, shown in the form, and
// never emailed - the admin copies it and shares it with the new user
// themselves (server/userAdmin.js's POST /api/admin/users).
//
// Rendered only while open, like UserDeleteDialog/UserStatusDialog - the
// parent passes a changing `key` so a fresh password generates each time
// it's reopened, instead of an effect resetting state on an `open` prop.
function AddUserDialog({ onClose, onCreated }) {
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;

        const timer = setTimeout(() => setCopied(false), 1200);

        return () => clearTimeout(timer);
    }, [copied]);

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function copyPassword() {
        try {
            await navigator.clipboard.writeText(form.password);
            setCopied(true);
        } catch {
            // Clipboard API can be denied - the password is still visible to select by hand.
        }
    }

    function handleClose() {
        if (saving) {
            return;
        }

        setError(null);
        onClose();
    }

    async function handleSubmit() {
        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError('First and last name are required.');
            return;
        }

        if (!form.email.trim()) {
            setError('Email is required.');
            return;
        }

        if (!form.role) {
            setError('Role is required.');
            return;
        }

        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { user } = await createUser(form);

            onCreated?.(user);
            handleClose();
        } catch (err) {
            console.error('Failed to create user:', err);
            setError(err.message || 'Failed to create the account.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>
                Add User
                <IconButton onClick={handleClose} disabled={saving} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                <Alert severity="info">
                    The account is created Active right away. Copy the password below and share it with them
                    yourself - it isn't emailed.
                </Alert>

                <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="First Name"
                            required
                            disabled={saving}
                            value={form.firstName}
                            onChange={(event) => setField('firstName', event.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Last Name"
                            required
                            disabled={saving}
                            value={form.lastName}
                            onChange={(event) => setField('lastName', event.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            size="small"
                            type="email"
                            label="Email"
                            required
                            disabled={saving}
                            value={form.email}
                            onChange={(event) => setField('email', event.target.value)}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            label="Role"
                            required
                            disabled={saving}
                            value={form.role}
                            onChange={(event) => setField('role', event.target.value)}
                        >
                            {ROLE_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Password"
                            required
                            disabled={saving}
                            value={form.password}
                            onChange={(event) => setField('password', event.target.value)}
                            slotProps={{
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={copyPassword} aria-label="Copy password">
                                                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
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
                    {saving ? 'Creating...' : 'Add User'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddUserDialog;
