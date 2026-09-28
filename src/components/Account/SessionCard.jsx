import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import SectionCard from '../Common/SectionCard';
import InfoRow from '../Common/InfoRow';
import useAuth from '../../hooks/useAuth';
import useDateFormat from '../../hooks/useDateFormat';
import { readSessionTimes } from '../../utils/sessionToken';
import { LogoutIcon } from '../icons';

// lastLogin: the account's latest sign-in on any device (undefined while
// the account is still loading).
function SessionCard({ lastLogin }) {
    const { token, logout } = useAuth();
    const { formatDateTime } = useDateFormat();
    const navigate = useNavigate();
    const { signedInAt, expiresAt } = readSessionTimes(token);

    function handleSignOut() {
        logout();
        navigate('/login');
    }

    return (
        <SectionCard title="Session">
            <InfoRow label="Signed in" value={formatDateTime(signedInAt) || '—'} labelWidth={200} />
            <InfoRow label="Session expires" value={formatDateTime(expiresAt) || '—'} labelWidth={200} />
            <InfoRow
                label="Latest sign-in (any device)"
                labelWidth={200}
                value={lastLogin === undefined ? '...' : formatDateTime(lastLogin) || 'Never'}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleSignOut}>
                    Sign out
                </Button>
            </Box>
        </SectionCard>
    );
}

export default SessionCard;
