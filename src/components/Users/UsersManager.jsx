import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
    Box,
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
import { EditIcon, CheckIcon, CloseIcon, LockIcon, ContentCopyIcon, PersonAddIcon } from '../icons';

import PageHeader from '../PageHeader';
import {
    getAllUsersFull,
    updateUserFirstName,
    updateUserLastName,
    updateUserEmail,
    resetUserPassword,
    sendTestEmail,
} from '../../services/UsersService';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';
import { isSuperAdminEmail, canDeleteUsers } from '../../constants/roles';
import AddUserDialog from './AddUserDialog';
import UserStatusDialog from './UserStatusDialog';
import UserDeleteDialog from './UserDeleteDialog';
import RoleChangeDialog from './RoleChangeDialog';
import UserDetailDrawer from './UserDetailDrawer';
import UserActionsMenu from './UserActionsMenu';
import { ACTIONS_BY_STATUS, HANDOVER_STATUSES, USER_STATUS_ACTIONS } from './userStatusActions';
import { formatRelativeTime } from '../../utils/relativeTime';
import useAuth from '../../hooks/useAuth';
import useDateFormat from '../../hooks/useDateFormat';
import { visibleScrollbarSx } from '../../utils/scrollbarSx';

// Super Admin is never a role anyone picks here - it's only ever set
// directly on Monday, for the two accounts in SUPER_ADMIN_EMAILS.
const ROLE_OPTIONS = Object.values(USERS_STATUS_OPTIONS.ROLE).filter(
    (role) => role !== USERS_STATUS_OPTIONS.ROLE.SUPER_ADMIN,
);
const { ACCOUNT_STATUS } = USERS_STATUS_OPTIONS;

function getStatusColor(status) {
    switch (status) {
        case ACCOUNT_STATUS.ACTIVE:
            return 'success';

        case ACCOUNT_STATUS.PENDING:
            return 'warning';

        case ACCOUNT_STATUS.BLOCKED:
        case ACCOUNT_STATUS.SUSPENDED:
        case ACCOUNT_STATUS.ARCHIVED:
            return 'error';

        default:
            return 'default';
    }
}

// Flexbox centers boxes geometrically, which doesn't match where a font's
// glyphs actually sit in their line box (varies by font/browser/OS - a fixed
// pixel nudge tuned for one of those doesn't hold for the others). This is
// the standard, font-metric-independent way to line up an icon with
// adjacent text: both are inline-level boxes, and the line's layout aligns
// them by their shared vertical-align, not by centering their boxes.
const ICON_ALIGN = { verticalAlign: 'middle', ml: 0.5 };

// Reveals on hover/focus alongside the edit button (shares its
// "row-edit-button" class and the parent span's hover sx), copies `value`,
// and briefly shows a checkmark - same pattern as the Database table viewer.
function CopyIconButton({ value, label }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;

        const timer = setTimeout(() => setCopied(false), 1200);

        return () => clearTimeout(timer);
    }, [copied]);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(String(value));
            setCopied(true);
        } catch {
            // Clipboard API can be denied (permissions, insecure context) -
            // the icon just doesn't change; the value is still there to select by hand.
        }
    }

    return (
        <IconButton
            size="small"
            onClick={handleCopy}
            aria-label={label}
            className="row-edit-button"
            sx={{ opacity: 0, transition: 'opacity 0.15s', ...ICON_ALIGN }}
        >
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
    );
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
            // A plain inline (not flex) container: lets vertical-align
            // line up the text and icons (see ICON_ALIGN) instead of
            // flexbox centering their boxes.
            <Box
                component="span"
                sx={{
                    whiteSpace: 'nowrap',
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                {/* Truncated, not wrapped: a long name wrapping to 2-3 lines
                made the icons (which only ever sit on one line) look
                misaligned with the first line of text. */}
                <Box
                    component="span"
                    title={`${user.firstName} ${user.lastName}`.trim()}
                    sx={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {user.firstName} {user.lastName}
                </Box>

                {(user.firstName || user.lastName) && (
                    <CopyIconButton value={`${user.firstName} ${user.lastName}`.trim()} label="Copy name" />
                )}

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit name"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s', ...ICON_ALIGN }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Box>
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
            <Box
                component="span"
                sx={{
                    whiteSpace: 'nowrap',
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <Box
                    component="span"
                    title={user.email || ''}
                    sx={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {user.email || '—'}
                </Box>

                {user.email && <CopyIconButton value={user.email} label="Copy email" />}

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit email"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s', ...ICON_ALIGN }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Box>
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

function UserRow({ user, rowActions, onNotice, onError, showRole, roleOptions, isSelf, viewerCanDelete, onRequestRole, onRequestAction, onRequestDelete, onSendTestEmail, onOpenDetails, onUpdate }) {
    // Fully protected, regardless of who's viewing - not tied to whoever
    // happens to be logged in. Role and status both locked (server-enforced
    // too: server/users.js, server/userAdmin.js).
    const isSuperAdminAccount = isSuperAdminEmail(user.email);
    const isRoleLocked = isSuperAdminAccount;
    // Delete is its own, narrower permission (canDeleteUsers) - not tied to
    // status, and never offered for yourself or a Super Admin account
    // (server-enforced too: server/userAdmin.js).
    const canDelete = viewerCanDelete && !isSelf && !isSuperAdminAccount;
    const { formatDate, formatDateTime } = useDateFormat();
    // You can't take your own account out of action - block, suspend or
    // archive (the server refuses any status but Active for yourself).
    const actions = isSuperAdminAccount
        ? []
        : (ACTIONS_BY_STATUS[user.accountStatus] ?? []).filter(
              (action) => !(isSelf && [ACCOUNT_STATUS.BLOCKED, ...HANDOVER_STATUSES].includes(USER_STATUS_ACTIONS[action].status)),
          );

    return (
        <TableRow hover>
            <TableCell>
                <NameCell user={user} onUpdate={onUpdate} />
            </TableCell>

            <TableCell>
                <EmailCell user={user} onUpdate={onUpdate} />
            </TableCell>

            {showRole && <TableCell>
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
                        {/* The account's own role is listed even when it is not offered here. */}
                        {(roleOptions.includes(user.role) || !user.role ? roleOptions : [user.role, ...roleOptions]).map((option) => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            </TableCell>}

            <TableCell>
                <Chip label={user.accountStatus || 'N/A'} color={getStatusColor(user.accountStatus)} size="small" />
            </TableCell>

            <TableCell sx={{ whiteSpace: 'nowrap' }} title={user.lastLogin ? formatDateTime(user.lastLogin) : undefined}>
                {formatRelativeTime(user.lastLogin) ?? 'Never'}
            </TableCell>

            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
            </TableCell>

            <TableCell>
                <PasswordCell user={user} />
            </TableCell>

            <TableCell>
                <UserActionsMenu
                    user={user}
                    actions={actions}
                    canDelete={canDelete}
                    onRequestAction={onRequestAction}
                    onRequestDelete={onRequestDelete}
                    onSendTestEmail={onSendTestEmail}
                    onOpenDetails={onOpenDetails}
                    extraActions={rowActions.map((action) => ({ label: action.label, onClick: () => action.onClick(user, { setNotice: onNotice, setError: onError }) }))}
                />
            </TableCell>
        </TableRow>
    );
}

const TABS = [
    { label: 'All', slug: 'all', status: null },
    { label: 'Active', slug: 'active', status: ACCOUNT_STATUS.ACTIVE },
    { label: 'Pending', slug: 'pending', status: ACCOUNT_STATUS.PENDING },
    { label: 'Blocked', slug: 'blocked', status: ACCOUNT_STATUS.BLOCKED },
    { label: 'Suspended', slug: 'suspended', status: ACCOUNT_STATUS.SUSPENDED },
    { label: 'Archived', slug: 'archived', status: ACCOUNT_STATUS.ARCHIVED },
];

function matchesSearch(user, term) {
    if (!term) {
        return true;
    }

    return [`${user.firstName} ${user.lastName}`, user.email].some((value) => value.toLowerCase().includes(term));
}

// The Users page, as one component the Rescuers page shares (docs/rescuer-onboarding.md).
// Every prop defaults to what the Users page does, so <UsersManager /> is the
// Users page. A page narrows it:
//   include(user)   which accounts the page lists
//   roleOptions     the roles its role picker offers
//   showRole        false hides the Role column (a page that manages one role)
//   labels          the wording that names the accounts ({ title, singular, add })
//   AddDialog       the dialog the add button opens (gets { onClose, onCreated })
//   rowActions      extra items in each row's menu: [{ label, onClick(user, { setNotice, setError }) }]
//   extraTabs       tabs with their own content, each { slug, label, count, subtitle, content({ reloadUsers, setNotice }) }.
//                   The accounts then have one last tab named by labels.title, and the account statuses are filter
//                   chips inside it (not tabs). An old link with ?tab=<status> opens that tab with that filter.
//   defaultTab      the tab slug shown when the address names none (default 'all')
const DEFAULT_LABELS = { title: 'Users', singular: 'user', add: 'Add User' };

function UsersManager({ include = () => true, roleOptions = ROLE_OPTIONS, showRole = true, labels = {}, AddDialog = AddUserDialog, rowActions = [], extraTabs = null, defaultTab = 'all' }) {
    const { title, singular, add } = { ...DEFAULT_LABELS, ...labels };
    const { user: currentUser } = useAuth();
    const [allUsers, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [search, setSearch] = useState('');
    const [addUserOpen, setAddUserOpen] = useState(false);
    // Bumped on every open so AddUserDialog's key changes - it generates a
    // fresh password on mount, so reopening needs a fresh mount too.
    const [addUserKey, setAddUserKey] = useState(0);
    const [statusRequest, setStatusRequest] = useState(null);
    const [deleteRequest, setDeleteRequest] = useState(null);
    const [roleRequest, setRoleRequest] = useState(null);
    const [detailUser, setDetailUser] = useState(null);
    // Bumped to load the list again without the spinner (the extra tab's content uses it).
    const [reloadKey, setReloadKey] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();
    // With extraTabs: the status filter of the accounts tab (a TABS slug).
    const [accountStatus, setAccountStatus] = useState(() => {
        const slug = searchParams.get('tab');

        return TABS.some((item) => item.slug === slug) ? slug : 'all';
    });

    useEffect(() => {
        let cancelled = false;

        async function loadUsers() {
            if (reloadKey === 0) setLoading(true);
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
    }, [reloadKey]);

    const users = allUsers.filter(include);
    const reloadUsers = () => setReloadKey((key) => key + 1);

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

    async function handleSendTestEmail(user) {
        setNotice(`Sending a test email to ${user.email}...`);

        try {
            const result = await sendTestEmail(user.id);
            setNotice(`Test email sent to ${result.email}. Check email_log / the Activity Log once it's delivered.`);
        } catch (err) {
            console.error('Failed to send test email:', err);
            setNotice(null);
            setError(err.message || 'Failed to send the test email.');
        }
    }

    function handleUserDeleted(userId, result) {
        const { cases, tasks } = result.reassigned ?? {};

        setUsers((current) => current.filter((user) => user.id !== userId));
        setDeleteRequest(null);
        setNotice(
            cases || tasks
                ? `Account deleted. ${cases} case(s) and ${tasks} task(s) were reassigned to you.`
                : 'Account deleted.',
        );
    }

    // The dialog closes itself once the invite email is confirmed sent (or
    // stays open to show the password if it wasn't) - this just updates the
    // list either way.
    function handleUserCreated(user) {
        setUsers((current) => [{ ...user, lastLogin: null }, ...current]);
        const emailProblem = user.emailStatus && user.emailStatus.status !== 'sent';

        setNotice(
            emailProblem
                ? `${user.firstName} ${user.lastName}'s account was created, but the email was not sent${user.emailStatus.error ? ` (${user.emailStatus.error})` : ''}. Use "Resend sign-in link" on their row.`.trim()
                : `${user.firstName} ${user.lastName}'s account was created.`.trim(),
        );
    }

    const viewerCanDelete = canDeleteUsers(currentUser?.email);

    const counts = Object.fromEntries(
        TABS.map((item) => [
            item.slug,
            item.status ? users.filter((user) => user.accountStatus === item.status).length : users.length,
        ]),
    );

    // ?user=<id> (e.g. "Open in Users" on an @mention's profile card) opens
    // that person's details once the list has loaded.
    const linkedUserId = searchParams.get('user');
    const shownUser = detailUser ?? (linkedUserId ? users.find((user) => String(user.id) === linkedUserId) ?? null : null);

    function closeDetails() {
        setDetailUser(null);

        if (linkedUserId) {
            setSearchParams((current) => {
                const next = new URLSearchParams(current);
                next.delete('user');
                return next;
            }, { replace: true });
        }
    }

    // Tab from ?tab=, else the default.
    const chipMode = Boolean(extraTabs);
    const extras = (extraTabs ?? []).map((item) => ({ label: item.label, slug: item.slug, status: null, extra: item }));
    const tabs = chipMode ? [...extras, { label: title, slug: 'accounts', status: null, accounts: true }] : [...extras, ...TABS];
    const findTab = (slug) => tabs.findIndex((item) => item.slug === slug);
    const requestedSlug = searchParams.get('tab');
    // An old link to an account status opens the accounts tab.
    const requestedTab = findTab(chipMode && TABS.some((item) => item.slug === requestedSlug) ? 'accounts' : requestedSlug);
    const tab = requestedTab !== -1 ? requestedTab : Math.max(findTab(defaultTab), 0);
    const onExtraTab = Boolean(tabs[tab].extra);

    function setTab(index) {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set('tab', tabs[index].slug);
            return next;
        }, { replace: true });
    }

    const term = search.trim().toLowerCase();
    const activeStatus = chipMode ? TABS.find((item) => item.slug === accountStatus).status : tabs[tab].status;
    const visibleUsers = users
        .filter((user) => !activeStatus || user.accountStatus === activeStatus)
        .filter((user) => matchesSearch(user, term));

    return (
        <>
            <PageHeader
                title={title}
                subtitle={tabs[tab].extra?.subtitle ?? (counts.pending > 0 ? `${counts.pending} account(s) awaiting approval` : `Manage ${singular} accounts`)}
                actions={
                    <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={() => {
                            setAddUserKey((key) => key + 1);
                            setAddUserOpen(true);
                        }}
                    >
                        {add}
                    </Button>
                }
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
                                {tabs.map((item) => (
                                    <Tab key={item.slug} label={`${item.label} (${item.extra ? item.extra.count : item.accounts ? counts.all : counts[item.slug]})`} />
                                ))}
                            </Tabs>

                            {onExtraTab ? tabs[tab].extra.content({ reloadUsers, setNotice }) : (<>
                            {chipMode && (
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                                    {TABS.map((item) => (
                                        <Chip
                                            key={item.slug}
                                            label={`${item.label} (${counts[item.slug]})`}
                                            color={accountStatus === item.slug ? 'primary' : 'default'}
                                            variant={accountStatus === item.slug ? 'filled' : 'outlined'}
                                            onClick={() => setAccountStatus(item.slug)}
                                        />
                                    ))}
                                </Stack>
                            )}

                            <TextField
                                size="small"
                                label="Search by name or email"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                sx={{ maxWidth: 360 }}
                            />

                            {visibleUsers.length === 0 ? (
                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                    {term ? `No ${singular}s match "${search.trim()}".` : `No ${singular}s here.`}
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
                                                {showRole && <TableCell>Role</TableCell>}
                                                <TableCell>Status</TableCell>
                                                <TableCell>Last login</TableCell>
                                                <TableCell>Created</TableCell>
                                                <TableCell>Password</TableCell>
                                                <TableCell>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {visibleUsers.map((user) => (
                                                <UserRow
                                                    key={user.id}
                                                    user={user}
                                                    showRole={showRole}
                                                    roleOptions={roleOptions}
                                                    isSelf={String(user.id) === String(currentUser?.id)}
                                                    viewerCanDelete={viewerCanDelete}
                                                    onUpdate={handleUserUpdate}
                                                    onRequestRole={(target, role) => {
                                                        if (role !== target.role) {
                                                            setRoleRequest({ user: target, role });
                                                        }
                                                    }}
                                                    onRequestAction={(target, action) => setStatusRequest({ user: target, action })}
                                                    onRequestDelete={(target) => setDeleteRequest({ user: target })}
                                                    onSendTestEmail={handleSendTestEmail}
                                                    rowActions={rowActions}
                                                    onNotice={setNotice}
                                                    onError={setError}
                                                    onOpenDetails={setDetailUser}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            </>)}
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

            {deleteRequest && (
                <UserDeleteDialog
                    key={`delete-${deleteRequest.user.id}`}
                    user={deleteRequest.user}
                    onClose={() => setDeleteRequest(null)}
                    onDeleted={handleUserDeleted}
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

            {addUserOpen && (
                <AddDialog key={addUserKey} onClose={() => setAddUserOpen(false)} onCreated={handleUserCreated} />
            )}

            <UserDetailDrawer key={shownUser?.id ?? 'closed'} user={shownUser} onClose={closeDetails} />
        </>
    );
}

export default UsersManager;
