import { useState } from 'react';
import {
    Alert,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { approveWixRequest, resendSignupLink } from '../../services/RescuerAgreementService';
import useDateFormat from '../../hooks/useDateFormat';
import { visibleScrollbarSx } from '../../utils/scrollbarSx';

// What each agreement status looks like, and the button for it. The agreement
// is explained in docs/rescuer-agreement.md.
const STATUS = {
    none: { label: 'Not approved', color: 'default' },
    sent: { label: 'Agreement sent', color: 'info' },
    expired: { label: 'Link expired', color: 'warning' },
    signed: { label: 'Signed', color: 'success' },
    signedUp: { label: 'Signed up', color: 'success' },
};

const BUTTON = {
    none: 'Approve and send agreement',
    sent: 'Resend agreement',
    expired: 'Resend agreement',
    signed: 'Resend sign-up link',
};

// The filters above the list: the statuses each one shows.
const FILTERS = [
    { label: 'All', statuses: null },
    { label: 'Not approved', statuses: ['none'] },
    { label: 'Agreement sent', statuses: ['sent', 'expired'] },
    { label: 'Signed', statuses: ['signed'] },
    { label: 'Signed up', statuses: ['signedUp'] },
];

const inFilter = (request, item) => !item.statuses || item.statuses.includes(request.agreement.status);

function sendResult(result, email) {
    return result.email?.status === 'sent'
        ? `The email was sent to ${email}.`
        : `The link was made but the email was not sent${result.email?.error ? ` (${result.email.error})` : ''}.`;
}

function describeAction(request) {
    return request.agreement.status === 'signed'
        ? `This emails ${request.email} a new link to sign up to Oriel.`
        : `This emails ${request.email} a link to read and sign the Rescuer Agreement. A link sent earlier stops working.`;
}

// The Wix requests tab of the Rescuers page: the people who filled in the
// rescuer form on the Wix site. After the call, an Admin approves a request
// here: the person gets the link to sign the Rescuer Agreement, and after
// signing the link to sign up to Oriel. `requests` is loaded by the page,
// which also needs the count; `onChanged` loads it again.
function WixRescuerRequests({ requests, loading, error, setNotice, onChanged }) {
    const { formatDateTime } = useDateFormat();
    const [filter, setFilter] = useState('All');
    const [confirming, setConfirming] = useState(null);
    const [saving, setSaving] = useState(false);
    const [dialogError, setDialogError] = useState(null);

    const shown = requests.filter((request) => inFilter(request, FILTERS.find((item) => item.label === filter)));

    async function handleConfirm() {
        const request = confirming;

        setSaving(true);
        setDialogError(null);

        try {
            const result = request.agreement.status === 'signed' ? await resendSignupLink(request.id) : await approveWixRequest(request.id);

            setNotice(sendResult(result, request.email));
            setConfirming(null);
            onChanged();
        } catch (err) {
            console.error('Failed to send the link:', err);
            setDialogError(err.message || 'Failed to send the link.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                People who filled in the rescuer form on the Wix site. After your call, approve them to send the Rescuer Agreement.
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {FILTERS.map((item) => (
                    <Chip
                        key={item.label}
                        label={`${item.label} (${requests.filter((request) => inFilter(request, item)).length})`}
                        color={filter === item.label ? 'primary' : 'default'}
                        variant={filter === item.label ? 'filled' : 'outlined'}
                        onClick={() => setFilter(item.label)}
                    />
                ))}
            </Stack>

            {loading ? (
                <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            ) : shown.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                    {requests.length === 0 ? 'No requests from Wix yet.' : 'No requests with this status.'}
                </Typography>
            ) : (
                <TableContainer sx={{ overflowX: 'auto', ...visibleScrollbarSx }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Rescues from</TableCell>
                                <TableCell>Cats</TableCell>
                                <TableCell>Received</TableCell>
                                <TableCell>Agreement</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {shown.map((request) => {
                                const { agreement } = request;
                                const name = request.fullName || [request.firstName, request.lastName].filter(Boolean).join(' ') || 'N/A';
                                const status = STATUS[agreement.status] ?? STATUS.none;

                                return (
                                    <TableRow key={request.id} hover>
                                        <TableCell>{name}</TableCell>
                                        <TableCell>{request.email ?? 'N/A'}</TableCell>
                                        <TableCell>{request.rescueLocation ?? 'N/A'}</TableCell>
                                        <TableCell>{request.catsToRehome ?? 'N/A'}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{request.receivedAt ? formatDateTime(request.receivedAt) : 'N/A'}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={status.label} color={status.color} />
                                            {agreement.signedAt && (
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    {formatDateTime(agreement.signedAt)}
                                                </Typography>
                                            )}
                                            {agreement.emailStatus && agreement.emailStatus !== 'sent' && (
                                                <Typography variant="caption" display="block" color="error">
                                                    Email {agreement.emailStatus}
                                                    {agreement.emailError ? `: ${agreement.emailError}` : ''}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            {BUTTON[agreement.status] && request.email && (
                                                <Button
                                                    size="small"
                                                    variant={agreement.status === 'none' ? 'contained' : 'outlined'}
                                                    onClick={() => {
                                                        setDialogError(null);
                                                        setConfirming(request);
                                                    }}
                                                >
                                                    {BUTTON[agreement.status]}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {confirming && (
                <Dialog open onClose={saving ? undefined : () => setConfirming(null)} maxWidth="sm" fullWidth>
                    <DialogTitle sx={{ fontSize: '1.1rem' }}>{BUTTON[confirming.agreement.status]}?</DialogTitle>

                    <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                        <Typography>{describeAction(confirming)}</Typography>

                        {dialogError && <Alert severity="error">{dialogError}</Alert>}
                    </DialogContent>

                    <DialogActions>
                        <Button size="small" onClick={() => setConfirming(null)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button size="small" variant="contained" onClick={handleConfirm} disabled={saving}>
                            {saving ? 'Sending...' : 'Send email'}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Stack>
    );
}

export default WixRescuerRequests;
