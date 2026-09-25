import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
    Tabs,
    Tab,
} from '@mui/material';
import { EditIcon, CheckIcon, CloseIcon, LockIcon } from '../../components/icons';

import PageHeader from '../../components/PageHeader';
import {
    getAllUsersFull,
    updateUserFirstName,
    updateUserLastName,
    updateUserEmail,
    resetUserPassword,
} from '../../services/UsersService';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';
import UserStatusDialog from '../../components/Users/UserStatusDialog';
import RoleChangeDialog from '../../components/Users/RoleChangeDialog';
import UserDetailDrawer from '../../components/Users/UserDetailDrawer';
import UserActionsMenu from '../../components/Users/UserActionsMenu';
import { ACTIONS_BY_STATUS, HANDOVER_STATUSES, USER_STATUS_ACTIONS } from '../../components/Users/userStatusActions';
import { formatRelativeTime } from '../../utils/relativeTime';
import useAuth from '../../hooks/useAuth';
import { visibleScrollbarSx } from '../../utils/scrollbarSx';

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

function UserRow({ user, isSelf, onRequestRole, onRequestAction, onOpenDetails, onUpdate }) {
    const isRoleLocked = user.email?.trim().toLowerCase() === ROLE_LOCKED_EMAIL;
    // You can't take your own account out of action (the server refuses too).
    const actions = (ACTIONS_BY_STATUS[user.accountStatus] ?? []).filter(
        (action) => !(isSelf && HANDOVER_STATUSES.includes(USER_STATUS_ACTIONS[action].status)),
    );

    return (
        <TableRow hover>
            <TableCell>
                <NameCell user={user} onUpdate={onUpdate} />
            </TableCell>

            <TableCell>
                <EmailCell user={user} onUpdate={onUpdate} />
            </TableCell>

            <TableCell>
                {isRoleLocked ? (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }} title="This account's role can't be changed here.">
                        <LockIcon fontSize="small" color="disabled" />
                        <span>{user.role || 'N/A'}</span>
                    </Stack>
                ) : (
                    <TextField
                        select
                        size="small"
                        value={user.role || ''}
                        // Confirmed in RoleChangeDialog before anything is saved.
                        onChange={(event) => onRequestRole(user, event.target.value)}
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

            <TableCell sx={{ whiteSpace: 'nowrap' }} title={user.lastLogin ? user.lastLogin.toLocaleString() : undefined}>
                {formatRelativeTime(user.lastLogin) ?? 'Never'}
            </TableCell>

            <TableCell>
                <PasswordCell user={user} />
            </TableCell>

            <TableCell>
                <UserActionsMenu
                    user={user}
                    actions={actions}
                    onRequestAction={onRequestAction}
                    onOpenDetails={onOpenDetails}
                />
            </TableCell>
        </TableRow>
    );
}

const TABS = [
    { label: 'All', slug: 'all', status: null },
    { label: 'Active', slug: 'active', status: ACCOUNT_STATUS.ACTIVE },
    { label: 'Pending', slug: 'pending', status: ACCOUNT_STATUS.PENDING },
    { label: 'Suspended', slug: 'suspended', status: ACCOUNT_STATUS.SUSPENDED },
    { label: 'Archived', slug: 'archived', status: ACCOUNT_STATUS.ARCHIVED },
];

function tabIndex(slug) {
    return TABS.findIndex((item) => item.slug === slug);
}

function matchesSearch(user, term) {
    if (!term) {
        return true;
    }

    return [`${user.firstName} ${user.lastName}`, user.email].some((value) => value.toLowerCase().includes(term));
}

function Users() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [search, setSearch] = useState('');
    const [statusRequest, setStatusRequest] = useState(null);
    const [roleRequest, setRoleRequest] = useState(null);
    const [detailUser, setDetailUser] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();

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

    function handleStatusChanged(userId, result) {
        const { cases, tasks } = result.reassigned ?? {};

        handleUserUpdate(userId, { accountStatus: result.accountStatus });
        setStatusRequest(null);
        setNotice(
            cases || tasks
                ? `Account set to ${result.accountStatus}. ${cases} case(s) and ${tasks} task(s) were reassigned to you.`
                : `Account set to ${result.accountStatus}.`,
        );
    }

    function handleRoleChanged(userId, updates) {
        handleUserUpdate(userId, updates);
        setRoleRequest(null);
    }

    const counts = Object.fromEntries(
        TABS.map((item) => [
            item.slug,
            item.status ? users.filter((user) => user.accountStatus === item.status).length : users.length,
        ]),
    );

    // Tab from ?tab=, else All.
    const requestedTab = tabIndex(searchParams.get('tab'));
    const tab = requestedTab !== -1 ? requestedTab : tabIndex('all');

    function setTab(index) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set('tab', TABS[index].slug);
            return next;
        }, { replace: true });
    }

    const term = search.trim().toLowerCase();
    const visibleUsers = users
        .filter((user) => !TABS[tab].status || user.accountStatus === TABS[tab].status)
        .filter((user) => matchesSearch(user, term));

    return (
        <>
            <PageHeader
                title="Users"
                subtitle={counts.pending > 0 ? `${counts.pending} account(s) awaiting approval` : 'Manage user accounts'}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {notice && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
                    {notice}
                </Alert>
            )}

            {loading ? (
                <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            ) : (
                <Card>
                    <CardContent>
                        <Stack spacing={2}>
                            <Tabs value={tab} onChange={(event, index) => setTab(index)} variant="scrollable" scrollButtons="auto">
                                {TABS.map((item) => (
                                    <Tab key={item.slug} label={`${item.label} (${counts[item.slug]})`} />
                                ))}
                            </Tabs>

                            <TextField
                                size="small"
                                label="Search by name or email"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                sx={{ maxWidth: 360 }}
                            />

                            {visibleUsers.length === 0 ? (
                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                    {term ? `No users match "${search.trim()}".` : 'No users here.'}
                                </Typography>
                            ) : (
                                <TableContainer
                                    sx={{
                                        overflowX: 'auto',
                                        // Visible scrollbar on every tab (hidden app-wide otherwise)
                                        // so a table wider than the card is clearly scrollable.
                                        ...visibleScrollbarSx,
                                    }}
                                >
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Name</TableCell>
                                                <TableCell>Email</TableCell>
                                                <TableCell>Role</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Last login</TableCell>
                                                <TableCell>Password</TableCell>
                                                <TableCell>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {visibleUsers.map((user) => (
                                                <UserRow
                                                    key={user.id}
                                                    user={user}
                                                    isSelf={String(user.id) === String(currentUser?.id)}
                                                    onUpdate={handleUserUpdate}
                                                    onRequestRole={(target, role) => {
                                                        if (role !== target.role) {
                                                            setRoleRequest({ user: target, role });
                                                        }
                                                    }}
                                                    onRequestAction={(target, action) => setStatusRequest({ user: target, action })}
                                                    onOpenDetails={setDetailUser}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {statusRequest && (
                <UserStatusDialog
                    key={`${statusRequest.user.id}-${statusRequest.action}`}
                    user={statusRequest.user}
                    action={statusRequest.action}
                    onClose={() => setStatusRequest(null)}
                    onChanged={handleStatusChanged}
                />
            )}

            {roleRequest && (
                <RoleChangeDialog
                    key={`${roleRequest.user.id}-${roleRequest.role}`}
                    user={roleRequest.user}
                    newRole={roleRequest.role}
                    onClose={() => setRoleRequest(null)}
                    onChanged={handleRoleChanged}
                />
            )}

            <UserDetailDrawer key={detailUser?.id ?? 'closed'} user={detailUser} onClose={() => setDetailUser(null)} />
        </>
    );
}

export default Users;
