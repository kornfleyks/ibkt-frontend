import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import { getUserOpenWork, setUserStatus } from '../../services/UsersService';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';
import { HANDOVER_STATUSES, USER_STATUS_ACTIONS } from './userStatusActions';

const { ACCOUNT_STATUS } = USERS_STATUS_OPTIONS;

function describeEffect(status) {
    switch (status) {
        case ACCOUNT_STATUS.ACTIVE:
            return 'They will be able to sign in.';
        case ACCOUNT_STATUS.PENDING:
            return "They go back into the approval queue and can't sign in until approved.";
        case ACCOUNT_STATUS.SUSPENDED:
            return "They are signed out on their next action and can't sign in until reactivated.";
        case ACCOUNT_STATUS.ARCHIVED:
            return 'They are signed out and the account is kept only for the record. It can be restored later.';
        default:
            return '';
    }
}

function OpenWorkSummary({ work }) {
    const total = work.cases.length + work.tasks.length;

    if (total === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                They have no open cases or tasks.
            </Typography>
        );
    }

    return (
        <Alert severity="warning">
            They have {work.cases.length} open case(s) and {work.tasks.length} open task(s). These will be
            reassigned to <strong>you</strong>, so you can hand them to someone else afterwards.
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                {work.cases.map((item) => (
                    <li key={`case-${item.id}`}>Case: {item.name} ({item.stage})</li>
                ))}
                {work.tasks.map((item) => (
                    <li key={`task-${item.id}`}>Task: {item.name} ({item.status})</li>
                ))}
            </Box>
        </Alert>
    );
}

// `action` is a key of USER_STATUS_ACTIONS. Rendered only while open; the
// parent passes a `key` so state resets between users/actions.
function UserStatusDialog({ user, action, onClose, onChanged }) {
    const config = USER_STATUS_ACTIONS[action];
    const [restoreTo, setRestoreTo] = useState(ACCOUNT_STATUS.ACTIVE);
    const targetStatus = config.status ?? restoreTo;
    const needsHandover = HANDOVER_STATUSES.includes(targetStatus);

    const [work, setWork] = useState(null);
    const [workError, setWorkError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!needsHandover) {
            return undefined;
        }

        let cancelled = false;

        getUserOpenWork(user.id)
            .then((data) => {
                if (!cancelled) {
                    setWork(data);
                }
            })
            .catch((err) => {
                console.error('Failed to load open work:', err);

                if (!cancelled) {
                    setWorkError("Couldn't check this user's open cases and tasks. They'll still be reassigned when you confirm.");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [user.id, needsHandover]);

    async function handleConfirm() {
        setSaving(true);
        setError(null);

        try {
            const result = await setUserStatus(user.id, targetStatus);
            onChanged(user.id, result);
        } catch (err) {
            console.error('Failed to change account status:', err);
            setError(err.message || 'Failed to change the account status.');
            setSaving(false);
        }
    }

    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const loadingWork = needsHandover && !work && !workError;

    return (
        <Dialog open onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
            <DialogTitle>{config.title}</DialogTitle>

            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    <strong>{name}</strong> ({user.email}) will be set to <strong>{targetStatus}</strong>.{' '}
                    {describeEffect(targetStatus)}
                </DialogContentText>

                {action === 'restore' && (
                    <RadioGroup
                        value={restoreTo}
                        onChange={(event) => setRestoreTo(event.target.value)}
                        sx={{ mb: 2 }}
                    >
                        <FormControlLabel value={ACCOUNT_STATUS.ACTIVE} control={<Radio />} label="Restore as Active" disabled={saving} />
                        <FormControlLabel value={ACCOUNT_STATUS.PENDING} control={<Radio />} label="Restore as Pending (needs approval again)" disabled={saving} />
                    </RadioGroup>
                )}

                {needsHandover && (
                    loadingWork ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                                Checking their open cases and tasks...
                            </Typography>
                        </Box>
                    ) : workError ? (
                        <Alert severity="info">{workError}</Alert>
                    ) : (
                        <OpenWorkSummary work={work} />
                    )
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>

                <Button
                    variant="contained"
                    color={config.color}
                    onClick={handleConfirm}
                    disabled={saving || loadingWork}
                >
                    {saving ? 'Saving...' : config.label}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default UserStatusDialog;
