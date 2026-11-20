import { useState } from 'react';
import {
    Alert,
    Box,
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
    TextField,
    Typography,
} from '@mui/material';
import PreAdoptionQuestion from '../ActiveApplications/AddApplicationDialog/PreAdoptionQuestion';
import { FOSTER_PAGES } from '../../constants/forms/fosterApplicationForm';
import { isVisible } from '../../constants/forms/preAdoptionForm';
import { approveFosterApplication, rejectFosterApplication } from '../../services/FosterApplicationService';
import useDateFormat from '../../hooks/useDateFormat';
import { visibleScrollbarSx } from '../../utils/scrollbarSx';

const FILTERS = ['Pending', 'Approved', 'Rejected', 'All'];
const STATUS_COLOR = { Pending: 'warning', Approved: 'success', Rejected: 'error' };
const MAX_REASON = 1000;

// What the applicant sees in the email when it did not go out, in words.
function emailWarning(email) {
    return email?.status === 'sent' ? null : `The email to the applicant was not sent${email?.error ? ` (${email.error})` : ''}.`;
}

// The application as the applicant filled it in, read-only, page by page.
function ApplicationDialog({ application, onClose }) {
    const { formatDateTime } = useDateFormat();

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>
                {application.firstName} {application.lastName}
                <Typography variant="body2" color="text.secondary">
                    {application.email} - sent {application.submittedAt ? formatDateTime(application.submittedAt) : 'N/A'} - wording {application.wordingVersion}
                </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 3 } }}>
                {application.status === 'Rejected' && (
                    <Alert severity="error">
                        Rejected by {application.reviewedByName}: {application.rejectReason}
                    </Alert>
                )}

                {application.status === 'Approved' && <Alert severity="success">Approved by {application.reviewedByName}.</Alert>}

                {application.answers?.residentPets === 'No' && (
                    <Alert severity="warning">The applicant answered No: any resident pets are vaccinated and neutered/spayed.</Alert>
                )}

                {application.answers?.disagreement === 'Yes' && (
                    <Alert severity="warning">The applicant reports a disagreement with a rescue organisation, or rehoming an animal independently.</Alert>
                )}

                {FOSTER_PAGES.map((page) => (
                    <Box key={page.title}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                            {page.title}
                        </Typography>

                        <Stack spacing={2}>
                            {page.questions
                                .filter((question) => question.type !== 'note' && isVisible(question, application.answers ?? {}))
                                .map((question) => (
                                    <PreAdoptionQuestion key={question.key} question={question} value={application.answers?.[question.key]} readOnly />
                                ))}
                        </Stack>
                    </Box>
                ))}
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function ApproveDialog({ application, onClose, onDone }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function handleApprove() {
        setSaving(true);
        setError(null);

        try {
            onDone(application, await approveFosterApplication(application.id));
        } catch (err) {
            console.error('Failed to approve the application:', err);
            setError(err.message || 'Failed to approve the application.');
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>Approve {application.firstName} {application.lastName}?</DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                <Typography>
                    This creates their foster record and sign-in, and emails {application.email} a link (valid for 7 days) to choose a
                    password. Their foster agreement is saved as Signed on the record.
                </Typography>

                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={onClose} disabled={saving}>
                    Cancel
                </Button>

                <Button size="small" variant="contained" color="success" onClick={handleApprove} disabled={saving}>
                    {saving ? 'Approving...' : 'Approve'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function RejectDialog({ application, onClose, onDone }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function handleReject() {
        if (!reason.trim()) {
            setError('Give a reason - it is included in the email to the applicant.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            onDone(application, await rejectFosterApplication(application.id, reason.trim()));
        } catch (err) {
            console.error('Failed to reject the application:', err);
            setError(err.message || 'Failed to reject the application.');
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>Reject {application.firstName} {application.lastName}?</DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                <Typography>The applicant is emailed this reason. They can apply again later.</Typography>

                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    required
                    label="Reason"
                    value={reason}
                    disabled={saving}
                    onChange={(event) => setReason(event.target.value.slice(0, MAX_REASON))}
                    helperText={`${reason.length}/${MAX_REASON}`}
                />

                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={onClose} disabled={saving}>
                    Cancel
                </Button>

                <Button size="small" variant="contained" color="error" onClick={handleReject} disabled={saving}>
                    {saving ? 'Rejecting...' : 'Reject'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// The Fosters page's Applications tab: every foster application, and
// Approve / Reject for the Pending ones. `applications` is loaded by the
// page; `onChanged` makes it (and the fosters list) load again.
function FosterApplications({ applications, loading, error, onChanged, setNotice }) {
    const { formatDateTime } = useDateFormat();
    const [filter, setFilter] = useState('Pending');
    const [viewing, setViewing] = useState(null);
    const [approving, setApproving] = useState(null);
    const [rejecting, setRejecting] = useState(null);

    const shown = applications.filter((application) => filter === 'All' || application.status === filter);
    const countOf = (status) => (status === 'All' ? applications.length : applications.filter((application) => application.status === status).length);

    function handleApproved(application, result) {
        const warning = emailWarning(result.email);
        const name = `${application.firstName} ${application.lastName}`;

        setApproving(null);
        setNotice(
            warning
                ? `${name} is approved, but ${warning} Use "Resend sign-in link" on their row to send it again.`
                : `${name} is approved. They have been emailed a link to choose their password.`,
        );
        onChanged();
    }

    function handleRejected(application, result) {
        const warning = emailWarning(result.email);
        const name = `${application.firstName} ${application.lastName}`;

        setRejecting(null);
        setNotice(warning ? `${name} is rejected, but ${warning}` : `${name} is rejected and has been emailed.`);
        onChanged();
    }

    if (loading) {
        return (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
                <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                {FILTERS.map((status) => (
                    <Chip
                        key={status}
                        label={`${status} (${countOf(status)})`}
                        color={filter === status ? 'primary' : 'default'}
                        variant={filter === status ? 'filled' : 'outlined'}
                        onClick={() => setFilter(status)}
                    />
                ))}
            </Stack>

            {shown.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                    No {filter === 'All' ? '' : `${filter.toLowerCase()} `}applications.
                </Typography>
            ) : (
                <TableContainer sx={{ overflowX: 'auto', ...visibleScrollbarSx }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Sent</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {shown.map((application) => (
                                <TableRow key={application.id} hover>
                                    <TableCell>
                                        {application.firstName} {application.lastName}
                                    </TableCell>
                                    <TableCell>{application.email}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{application.submittedAt ? formatDateTime(application.submittedAt) : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Chip label={application.status} color={STATUS_COLOR[application.status] ?? 'default'} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            <Button size="small" onClick={() => setViewing(application)}>
                                                View
                                            </Button>

                                            {application.status === 'Pending' && (
                                                <>
                                                    <Button size="small" color="success" onClick={() => setApproving(application)}>
                                                        Approve
                                                    </Button>

                                                    <Button size="small" color="error" onClick={() => setRejecting(application)}>
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {viewing && <ApplicationDialog application={viewing} onClose={() => setViewing(null)} />}
            {approving && <ApproveDialog application={approving} onClose={() => setApproving(null)} onDone={handleApproved} />}
            {rejecting && <RejectDialog application={rejecting} onClose={() => setRejecting(null)} onDone={handleRejected} />}
        </Stack>
    );
}

export default FosterApplications;
