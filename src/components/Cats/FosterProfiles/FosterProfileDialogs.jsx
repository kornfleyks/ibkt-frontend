import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import PreAdoptionQuestion from '../../ActiveApplications/AddApplicationDialog/PreAdoptionQuestion';
import { PROFILE_PAGES } from '../../../constants/forms/fosterProfileForm';
import { isVisible } from '../../../constants/forms/preAdoptionForm';
import { FOSTER_FILE_RULES, FOSTER_FILE_KINDS } from '../../../constants/fosterPortal';
import { applyFosterProfile, getFosterProposal, rejectFosterProfile } from '../../../services/FosterReviewService';
import { formatBytes } from '../../../utils/formatBytes';
import useDateFormat from '../../../hooks/useDateFormat';

// Monday keeps at most this many characters of a long text and cuts the rest
// without saying so (server/fosterPortal/mapping.js LONG_TEXT_LIMIT).
const TEXT_LIMIT = 2000;
const MAX_REASON = 1000;

// The profile as the foster sent it, read-only: the answers page by page and the
// files by kind, with Apply and Send back for a waiting profile.
export function ProfileDialog({ profile, onClose, onApply, onReject }) {
    const { formatDateTime } = useDateFormat();
    const pending = profile.status === 'Pending';

    return (
        <Dialog open onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>
                Kitty Profile from {profile.fosterName}
                <Typography variant="body2" color="text.secondary">
                    Sent {profile.submittedAt ? formatDateTime(profile.submittedAt) : 'N/A'} - {profile.status}
                </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 3 } }}>
                {profile.status === 'Rejected' && (
                    <Alert severity="warning">
                        Sent back by {profile.reviewedByName}: {profile.rejectReason}
                    </Alert>
                )}

                {profile.status === 'Applied' && (
                    <Alert severity="success">
                        Applied by {profile.reviewedByName}. Cat fields changed: {profile.appliedFields.length > 0 ? profile.appliedFields.join(', ') : 'none'}. The files are on the cat now.
                    </Alert>
                )}

                {PROFILE_PAGES.map((page) => (
                    <Box key={page.title}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                            {page.title}
                        </Typography>

                        <Stack spacing={2}>
                            {page.questions
                                .filter((question) => isVisible(question, profile.answers ?? {}))
                                .map((question) => (
                                    <PreAdoptionQuestion key={question.key} question={question} value={profile.answers?.[question.key]} readOnly />
                                ))}
                        </Stack>
                    </Box>
                ))}

                <Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                        Files
                    </Typography>

                    <Stack spacing={1.5}>
                        {FOSTER_FILE_KINDS.map((kind) => {
                            const files = profile.files.filter((file) => file.kind === kind);

                            return (
                                <Box key={kind}>
                                    <Typography variant="body2" fontWeight={600}>
                                        {FOSTER_FILE_RULES[kind].label} ({files.length})
                                    </Typography>

                                    {files.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">
                                            None.
                                        </Typography>
                                    ) : (
                                        files.map((file) => (
                                            <Typography key={file.assetId} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                                                {/^https:\/\//.test(file.url ?? '') ? (
                                                    <a href={file.url} target="_blank" rel="noreferrer">
                                                        {file.name}
                                                    </a>
                                                ) : (
                                                    file.name
                                                )}
                                                {file.sizeBytes ? ` (${formatBytes(file.sizeBytes)})` : ''}
                                            </Typography>
                                        ))
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={onClose}>
                    Close
                </Button>

                {pending && (
                    <>
                        <Button size="small" color="error" onClick={onReject}>
                            Send back
                        </Button>

                        <Button size="small" variant="contained" onClick={onApply}>
                            Apply to the cat
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}

// Apply: the foster's answers as proposals for the cat's fields, next to the
// current values. Staff tick what to change and can edit any proposed value. A
// text over the limit stops Apply until it is shortened.
export function ApplyDialog({ catId, profile, onClose, onApplied }) {
    const [rows, setRows] = useState(null);
    const [moveFiles, setMoveFiles] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        getFosterProposal(catId, profile.id)
            .then((fields) => !cancelled && setRows(fields.map((field) => ({ ...field, apply: field.defaultApply, value: field.proposed }))))
            .catch((err) => {
                console.error('Failed to load the proposal:', err);

                if (!cancelled) setError(err.message || 'Failed to load what Apply would change.');
            });

        return () => {
            cancelled = true;
        };
    }, [catId, profile.id]);

    function update(key, changes) {
        setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    }

    const chosen = (rows ?? []).filter((row) => row.apply);
    const overLimit = chosen.some((row) => row.kind === 'text' && row.value.length > TEXT_LIMIT);

    async function handleApply() {
        setSaving(true);
        setError(null);

        try {
            const fields = Object.fromEntries(chosen.map((row) => [row.key, row.value]));
            const result = await applyFosterProfile(catId, profile.id, fields, moveFiles);

            onApplied(result, fields);
        } catch (err) {
            console.error('Failed to apply the profile:', err);
            setError(err.message || 'Failed to apply the profile.');
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>Apply {profile.fosterName}'s profile to the cat</DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                <Typography variant="body2" color="text.secondary">
                    These are suggestions made from the foster's answers. Tick the ones to change and edit any value. A value that the cat already has is not ticked. The
                    full answers always stay on the profile.
                </Typography>

                {!rows && !error && (
                    <Stack sx={{ alignItems: 'center', py: 3 }}>
                        <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                    </Stack>
                )}

                {rows && (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" />
                                <TableCell>Field</TableCell>
                                <TableCell>Now</TableCell>
                                <TableCell sx={{ minWidth: 280 }}>Change to</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.key} sx={{ verticalAlign: 'top' }}>
                                    <TableCell padding="checkbox">
                                        <Checkbox checked={row.apply} disabled={saving} onChange={(event) => update(row.key, { apply: event.target.checked })} inputProps={{ 'aria-label': `Change ${row.label}` }} />
                                    </TableCell>

                                    <TableCell>{row.label}</TableCell>

                                    <TableCell sx={{ maxWidth: 240 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 120, overflow: 'auto' }}>
                                            {String(row.current || '').trim() || 'Not set'}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        {row.kind === 'select' ? (
                                            <TextField select size="small" fullWidth value={row.value} disabled={saving} onChange={(event) => update(row.key, { value: event.target.value, apply: true })}>
                                                {row.options.map((option) => (
                                                    <MenuItem key={option} value={option}>
                                                        {option}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        ) : (
                                            <TextField
                                                size="small"
                                                fullWidth
                                                multiline
                                                minRows={3}
                                                maxRows={10}
                                                value={row.value}
                                                disabled={saving}
                                                onChange={(event) => update(row.key, { value: event.target.value, apply: true })}
                                                error={row.value.length > TEXT_LIMIT}
                                                helperText={`${row.value.length} / ${TEXT_LIMIT}${row.value.length > TEXT_LIMIT ? ' - too long: Monday keeps no more, so shorten it or leave it unticked' : ''}`}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {rows && rows.length === 0 && <Alert severity="info">The answers do not suggest any change to the cat's fields.</Alert>}

                {rows && (
                    <FormControlLabel
                        control={<Checkbox checked={moveFiles} disabled={saving} onChange={(event) => setMoveFiles(event.target.checked)} />}
                        label={`Also move the foster's ${profile.files.length} files to the cat (photos, videos, passport and vet report as medical documents)`}
                    />
                )}

                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={onClose} disabled={saving}>
                    Cancel
                </Button>

                <Button size="small" variant="contained" color="success" onClick={handleApply} disabled={saving || !rows || overLimit}>
                    {saving ? 'Applying...' : `Apply${chosen.length ? ` (${chosen.length} ${chosen.length === 1 ? 'field' : 'fields'})` : ''}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

// Send back: the reason is shown to the foster, who can fix the profile and send
// it again. Their files stay.
export function RejectDialog({ catId, profile, onClose, onRejected }) {
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function handleReject() {
        if (!reason.trim()) {
            setError('Give a reason. The foster sees it.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await rejectFosterProfile(catId, profile.id, reason.trim());
            onRejected();
        } catch (err) {
            console.error('Failed to send the profile back:', err);
            setError(err.message || 'Failed to send the profile back.');
            setSaving(false);
        }
    }

    return (
        <Dialog open onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>Send {profile.fosterName}'s profile back?</DialogTitle>

            <DialogContent dividers sx={{ '& > * + *': { mt: 2 } }}>
                <Typography>The foster sees this reason in their portal and can change the profile and the files, then send it again. Nothing on the cat changes.</Typography>

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
                    {saving ? 'Sending...' : 'Send back'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
