import { useState } from 'react';
import {
    Alert,
    Button,
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
import FilterChips from '../Common/FilterChips';
import StatusTag from '../Common/StatusTag';
import { approveWixRequest, resendSignupLink } from '../../services/RescuerAgreementService';
import useDateFormat from '../../hooks/useDateFormat';
import { visibleScrollbarSx } from '../../utils/scrollbarSx';

// The tag of each agreement status (docs/rescuer-agreement.md), with the stage
// of the journey it belongs to in the Oriel mock-ups: Applied, Approved, Signed.
const STATUS = {
    none: { label: 'Applied', tone: 'butter' },
    sent: { label: 'Approved', tone: 'lavender' },
    expired: { label: 'Link expired', tone: 'peach' },
    signed: { label: 'Signed', tone: 'sage' },
    signedUp: { label: 'Signed', tone: 'sage' },
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
    { label: 'Applied', statuses: ['none'] },
    { label: 'Approved', statuses: ['sent', 'expired'] },
    { label: 'Signed', statuses: ['signed', 'signedUp'] },
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

// What happens next for a request, as two lines: the main one and a quieter one
// (the "Next step" column of the mock-up).
function nextStep(request, formatDate) {
    const { agreement } = request;
    const day = (date) => (date ? formatDate(date) : null);

    switch (agreement.status) {
        case 'none':
            return {
                main: 'Waiting for your decision',
                sub: request.packEmailStatus === 'sent' ? `Pack sent ${day(request.packEmailSentAt)}` : `Applied ${day(request.receivedAt)}`,
            };
        case 'sent':
            return {
                main: `Agreement sent${day(agreement.emailAt) ? ` ${day(agreement.emailAt)}` : ''}, not signed yet`,
                sub: `The link works until ${day(agreement.expiresAt)}`,
            };
        case 'expired':
            return { main: `The agreement link expired ${day(agreement.expiresAt)}`, sub: 'Send the agreement again' };
        case 'signed':
            return { main: `Signed ${day(agreement.signedAt)}`, sub: 'Sign-up link sent, waiting for them to sign up' };
        case 'signedUp':
            return { main: `Signed ${day(agreement.signedAt)}`, sub: 'Signed up and can add cats' };
        default:
            return { main: '', sub: null };
    }
}

// The Wix requests tab of the Rescuers page, shown as the Rescue Partners list
// of the Oriel mock-ups: the people who filled in the rescuer form on the Wix
// site. After the call, an Admin approves a request here: the person gets the
// link to sign the Rescuer Agreement, and after signing the link to sign up to
// Oriel. `requests` is loaded by the page, which also needs the count;
// `onChanged` loads it again.
function WixRescuerRequests({ requests, loading, error, setNotice, onChanged }) {
    const { formatDate } = useDateFormat();
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
        <Stack spacing={2.5}>
            <Typography color="text.secondary">Applied → Approved → Signed. Signed partners can add cats.</Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <FilterChips
                options={FILTERS.map((item) => ({ value: item.label, label: item.label, count: requests.filter((request) => inFilter(request, item)).length }))}
                value={filter}
                onChange={setFilter}
            />

            {loading ? (
                <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            ) : shown.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                    {requests.length === 0 ? 'No requests from Wix yet.' : 'No requests with this status.'}
                </Typography>
            ) : (
                <TableContainer sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 4, ...visibleScrollbarSx }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Rescue partner</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Cats</TableCell>
                                <TableCell>Next step</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {shown.map((request) => {
                                const { agreement } = request;
                                const name = request.fullName || [request.firstName, request.lastName].filter(Boolean).join(' ') || 'N/A';
                                const status = STATUS[agreement.status] ?? STATUS.none;
                                const next = nextStep(request, formatDate);

                                return (
                                    <TableRow key={request.id} sx={agreement.status === 'none' ? { bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(240, 132, 130, 0.12)' : '#FBEDEC') } : undefined}>
                                        <TableCell sx={{ minWidth: 180 }}>
                                            <Typography sx={{ fontWeight: 800 }}>{name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {request.rescueLocation ?? request.email ?? ''}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <StatusTag label={status.label} tone={status.tone} />
                                        </TableCell>

                                        <TableCell>{request.catsToRehome ?? 'N/A'}</TableCell>

                                        <TableCell sx={{ minWidth: 240 }}>
                                            <Typography sx={{ fontWeight: 700 }}>{next.main}</Typography>
                                            {next.sub && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {next.sub}
                                                </Typography>
                                            )}
                                            {agreement.emailStatus && agreement.emailStatus !== 'sent' && (
                                                <Typography variant="body2" color="error">
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
