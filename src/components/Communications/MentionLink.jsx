import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InfoRow from '../Common/InfoRow';
import useAuth from '../../hooks/useAuth';
import { getUserProfileCard } from '../../services/UsersService';
import { formatPhone, telHref } from '../../utils/phone';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

function initialsOf(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}

function ProfileCard({ user, isSelf, onNavigate }) {
    const { hasRole } = useAuth();
    const phone = formatPhone(user.phone);
    const phoneHref = telHref(user.phone);
    const active = user.accountStatus === USERS_STATUS_OPTIONS.ACCOUNT_STATUS.ACTIVE;

    return (
        <Box sx={{ p: 2, width: 320, maxWidth: 'calc(100vw - 32px)' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>{initialsOf(user.name)}</Avatar>

                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                        {user.name}
                    </Typography>

                    <Stack direction="row" spacing={0.5}>
                        <Chip size="small" label={user.role || 'No role'} />
                        {!active && <Chip size="small" variant="outlined" color="warning" label={user.accountStatus || 'Inactive'} />}
                    </Stack>
                </Box>
            </Stack>

            <InfoRow
                label="Email"
                labelWidth={64}
                value={
                    user.email ? (
                        <Link href={`mailto:${user.email}`} sx={{ wordBreak: 'break-all', color: 'info.main' }}>
                            {user.email}
                        </Link>
                    ) : '—'
                }
            />
            <InfoRow
                label="Phone"
                labelWidth={64}
                value={phoneHref ? <Link href={phoneHref} sx={{ color: 'info.main' }}>{phone}</Link> : '—'}
            />

            {(isSelf || hasRole('Admin')) && (
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
                    {isSelf && (
                        <Button size="small" component={RouterLink} to="/account?tab=profile" onClick={onNavigate}>
                            Edit my profile
                        </Button>
                    )}

                    {hasRole('Admin') && (
                        <Button size="small" component={RouterLink} to={`/users?user=${user.id}`} onClick={onNavigate}>
                            Open in Users
                        </Button>
                    )}
                </Stack>
            )}
        </Box>
    );
}

// An @mention in a Communications message: "@Name", stronger when it's the
// signed-in user; clicking it shows that person's profile card.
function MentionLink({ userId, name, isSelf }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const [card, setCard] = useState({ status: 'idle' });

    async function handleOpen(event) {
        setAnchorEl(event.currentTarget);
        setCard({ status: 'loading' });

        try {
            setCard({ status: 'loaded', user: await getUserProfileCard(userId) });
        } catch (err) {
            setCard({ status: 'error', error: err.message || "Couldn't load this person's details." });
        }
    }

    function handleClose() {
        setAnchorEl(null);
    }

    return (
        <>
            <Link
                component="button"
                type="button"
                underline="hover"
                onClick={handleOpen}
                aria-haspopup="dialog"
                sx={{
                    font: 'inherit',
                    fontWeight: 600,
                    color: 'info.main',
                    verticalAlign: 'baseline',
                    ...(isSelf && {
                        bgcolor: 'action.selected',
                        borderRadius: 0.5,
                        px: 0.5,
                    }),
                }}
            >
                @{name}
            </Link>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                {card.status === 'loaded' ? (
                    <ProfileCard user={card.user} isSelf={isSelf} onNavigate={handleClose} />
                ) : card.status === 'error' ? (
                    <Typography variant="body2" color="error" sx={{ p: 2, maxWidth: 280 }}>
                        {card.error}
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, width: 120 }}>
                        <CircularProgress size={22} sx={{ color: 'text.secondary' }} />
                    </Box>
                )}
            </Popover>
        </>
    );
}

export default MentionLink;
