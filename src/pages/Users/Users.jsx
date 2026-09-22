import { useEffect, useState } from 'react';

import {
    Table,
    TableContainer,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Chip,
    TextField,
    MenuItem,
    Button,
    IconButton,
    Stack,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/CheckOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';

import PageHeader from '../../components/PageHeader';
import {
    getAllUsersFull,
    updateUserStatus,
    updateUserRole,
    updateUserFirstName,
    updateUserLastName,
    updateUserEmail,
    resetUserPassword,
} from '../../services/UsersService';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

const ROLE_OPTIONS = Object.values(USERS_STATUS_OPTIONS.ROLE);

// This specific account's role is always locked on this page, regardless
// of who's viewing - not tied to whoever happens to be logged in.
const ROLE_LOCKED_EMAIL = 'billkifonidis@gmail.com';
const { ACCOUNT_STATUS } = USERS_STATUS_OPTIONS;

function getStatusColor(status) {
    switch (status) {
        case ACCOUNT_STATUS.ACTIVE:
            return 'success';

        case ACCOUNT_STATUS.PENDING:
            return 'warning';

        case ACCOUNT_STATUS.SUSPENDED:
        case ACCOUNT_STATUS.ARCHIVED:
            return 'error';

        default:
            return 'default';
    }
}

function NameCell({ user, onUpdate }) {
    const [editing, setEditing] = useState(false);
    const [firstName, setFirstName] = useState(user.firstName);
    const [lastName, setLastName] = useState(user.lastName);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    function startEditing() {
        setFirstName(user.firstName);
        setLastName(user.lastName);
        setError(null);
        setEditing(true);
    }

    async function handleSave() {
        setSaving(true);
        setError(null);

        try {
            const updates = {};

            if (firstName !== user.firstName) {
                await updateUserFirstName(user.id, firstName);
                updates.firstName = firstName;
            }

            if (lastName !== user.lastName) {
                await updateUserLastName(user.id, lastName);
                updates.lastName = lastName;
            }

            onUpdate(user.id, updates);
            setEditing(false);
        } catch (err) {
            console.error('Failed to update name:', err);
            setError('Failed to save.');
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <span>{user.firstName} {user.lastName}</span>

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit name"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    return (
        <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <TextField
                    size="small"
                    label="First"
                    value={firstName}
                    disabled={saving}
                    onChange={(event) => setFirstName(event.target.value)}
                    sx={{ width: 100 }}
                />

                <TextField
                    size="small"
                    label="Last"
                    value={lastName}
                    disabled={saving}
                    onChange={(event) => setLastName(event.target.value)}
                    sx={{ width: 100 }}
                />

                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save name">
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            {error && (
                <Typography variant="caption" color="error">
                    {error}
                </Typography>
            )}
        </Stack>
    );
}

function EmailCell({ user, onUpdate }) {
    const [editing, setEditing] = useState(false);
    const [email, setEmail] = useState(user.email);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    function startEditing() {
        setEmail(user.email);
        setError(null);
        setEditing(true);
    }

    async function handleSave() {
        if (!email.trim()) {
            setError('Email is required.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await updateUserEmail(user.id, email);
            onUpdate(user.id, { email });
            setEditing(false);
        } catch (err) {
            console.error('Failed to update email:', err);
            setError('Failed to save.');
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <span>{user.email || '—'}</span>

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit email"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    return (
        <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <TextField
                    size="small"
                    type="email"
                    value={email}
                    disabled={saving}
                    onChange={(event) => setEmail(event.target.value)}
                    sx={{ minWidth: 200 }}
                />

                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save email">
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            {error && (
                <Typography variant="caption" color="error">
                    {error}
                </Typography>
            )}
        </Stack>
    );
}

function PasswordCell({ user }) {
    const [editing, setEditing] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    function startEditing() {
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(false);
        setEditing(true);
    }

    async function handleSave() {
        if (newPassword.length < 8) {
            setError('At least 8 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await resetUserPassword(user.id, newPassword);
            setEditing(false);
            setSuccess(true);
        } catch (err) {
            console.error('Failed to reset password:', err);
            setError('Failed to save.');
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack spacing={0.25}>
                <Button size="small" variant="outlined" onClick={startEditing}>
                    {success ? 'Password Set - Reset Again' : 'Set Password'}
                </Button>
            </Stack>
        );
    }

    return (
        <Stack spacing={0.5}>
            <TextField
                size="small"
                type="password"
                label="New Password"
                value={newPassword}
                disabled={saving}
                onChange={(event) => setNewPassword(event.target.value)}
                sx={{ minWidth: 160 }}
            />

            <TextField
                size="small"
                type="password"
                label="Confirm"
                value={confirmPassword}
                disabled={saving}
                onChange={(event) => setConfirmPassword(event.target.value)}
                sx={{ minWidth: 160 }}
            />

            <Stack direction="row" spacing={1}>
                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save password">
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            {error && (
                <Typography variant="caption" color="error">
                    {error}
                </Typography>
            )}
        </Stack>
    );
}

function UserRow({ user, onUpdate }) {
    const isRoleLocked = user.email?.trim().toLowerCase() === ROLE_LOCKED_EMAIL;
    const [savingField, setSavingField] = useState(null);
    const [error, setError] = useState(null);

    async function handleStatusChange(status) {
        setSavingField('status');
        setError(null);

        try {
            await updateUserStatus(user.id, status);
            onUpdate(user.id, { accountStatus: status });
        } catch (err) {
            console.error('Failed to update account status:', err);
            setError('Failed to update status.');
        } finally {
            setSavingField(null);
        }
    }

    async function handleRoleChange(role) {
        setSavingField('role');
        setError(null);

        try {
            await updateUserRole(user.id, role);
            onUpdate(user.id, { role });
        } catch (err) {
            console.error('Failed to update role:', err);
            setError('Failed to update role.');
        } finally {
            setSavingField(null);
        }
    }

    return (
        <TableRow>
            <TableCell>
                <NameCell user={user} onUpdate={onUpdate} />
            </TableCell>

            <TableCell>
                <EmailCell user={user} onUpdate={onUpdate} />
            </TableCell>

            <TableCell>
                {isRoleLocked ? (
                    <Stack direction="row" alignItems="center" spacing={0.5} title="This account's role can't be changed here.">
                        <LockIcon fontSize="small" color="disabled" />
                        <span>{user.role || 'N/A'}</span>
                    </Stack>
                ) : (
                    <TextField
                        select
                        size="small"
                        value={user.role || ''}
                        disabled={savingField === 'role'}
                        onChange={(event) => handleRoleChange(event.target.value)}
                        sx={{ minWidth: 130 }}
                    >
                        {ROLE_OPTIONS.map((option) => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            </TableCell>

            <TableCell>
                <Chip label={user.accountStatus || 'N/A'} color={getStatusColor(user.accountStatus)} size="small" />
            </TableCell>

            <TableCell>
                <PasswordCell user={user} />
            </TableCell>

            <TableCell>
                {error && (
                    <Alert severity="error" sx={{ fontSize: '0.75rem', mb: 1 }}>
                        {error}
                    </Alert>
                )}

                {user.accountStatus === ACCOUNT_STATUS.PENDING && (
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={savingField === 'status'}
                            onClick={() => handleStatusChange(ACCOUNT_STATUS.ACTIVE)}
                        >
                            {savingField === 'status' ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : 'Approve'}
                        </Button>

                        <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={savingField === 'status'}
                            onClick={() => handleStatusChange(ACCOUNT_STATUS.ARCHIVED)}
                        >
                            Reject
                        </Button>
                    </Stack>
                )}

                {user.accountStatus === ACCOUNT_STATUS.ACTIVE && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={savingField === 'status'}
                        onClick={() => handleStatusChange(ACCOUNT_STATUS.SUSPENDED)}
                    >
                        Suspend
                    </Button>
                )}

                {user.accountStatus === ACCOUNT_STATUS.SUSPENDED && (
                    <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={savingField === 'status'}
                        onClick={() => handleStatusChange(ACCOUNT_STATUS.ACTIVE)}
                    >
                        Reactivate
                    </Button>
                )}
            </TableCell>
        </TableRow>
    );
}

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadUsers() {
            setLoading(true);
            setError(null);

            try {
                const data = await getAllUsersFull();

                if (!cancelled) {
                    setUsers(data);
                }
            } catch (err) {
                console.error('Failed to load users:', err);

                if (!cancelled) {
                    setError('Failed to load users.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadUsers();

        return () => {
            cancelled = true;
        };
    }, []);

    function handleUserUpdate(userId, updates) {
        setUsers((current) =>
            current.map((user) => (user.id === userId ? { ...user, ...updates } : user)),
        );
    }

    const pendingCount = users.filter((user) => user.accountStatus === ACCOUNT_STATUS.PENDING).length;

    return (
        <>
            <PageHeader
                title="Users"
                subtitle={pendingCount > 0 ? `${pendingCount} account(s) awaiting approval` : 'Manage user accounts'}
            />

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
                        <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 900 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Role</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Password</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {users.map((user) => (
                                        <UserRow key={user.id} user={user} onUpdate={handleUserUpdate} />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}
        </>
    );
}

export default Users;
