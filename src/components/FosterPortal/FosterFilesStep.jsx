import { useRef, useState } from 'react';
import { Alert, Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { DeleteIcon } from '../icons';
import { FOSTER_FILE_RULES, FOSTER_FILE_KINDS, fosterFileProblem } from '../../constants/fosterPortal';
import { uploadFosterFile, deleteFosterFile } from '../../services/FosterPortalService';
import { formatBytes } from '../../utils/formatBytes';

// The last step of the Kitty Profile: the photos, videos, passport and vet
// report. Each file is sent as soon as it is chosen and waits for IBKT's review
// with the profile. `files` is the list the server holds
// ([{ assetId, name, kind, sizeBytes }]); `onFilesChange(updater)` keeps the
// page's copy in step.
function KindSection({ catId, kind, files, onFilesChange, disabled }) {
    const rule = FOSTER_FILE_RULES[kind];
    const input = useRef(null);
    const mine = files.filter((file) => file.kind === kind);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);

    async function handleChosen(event) {
        const chosen = [...event.target.files];

        event.target.value = '';

        if (chosen.length === 0) return;

        setBusy(true);
        setMessage(null);

        const problems = [];

        // One at a time: a failed file does not stop the rest, and Monday is not flooded.
        for (const file of chosen) {
            const problem = fosterFileProblem(kind, file);

            if (problem) {
                problems.push(problem);
                continue;
            }

            try {
                const { file: saved } = await uploadFosterFile(catId, kind, file);

                onFilesChange((current) => [...current, saved]);
            } catch (err) {
                console.error('Failed to upload the file:', err);
                problems.push(`"${file.name}": ${err.message || 'the upload failed.'}`);
            }
        }

        setBusy(false);
        setMessage(problems.length ? problems.join(' ') : null);
    }

    async function handleDelete(file) {
        setBusy(true);
        setMessage(null);

        try {
            await deleteFosterFile(catId, file.assetId);
            onFilesChange((current) => current.filter((entry) => entry.assetId !== file.assetId));
        } catch (err) {
            console.error('Failed to remove the file:', err);
            setMessage(err.message || 'Failed to remove the file.');
        } finally {
            setBusy(false);
        }
    }

    const enough = mine.length >= rule.min;

    return (
        <Box>
            <Typography variant="subtitle1" fontWeight={600}>
                {rule.label}
                {rule.min > 0 ? ` (${mine.length} of at least ${rule.min})` : ` (${mine.length})`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {rule.help} Up to {rule.max} {rule.max === 1 ? 'file' : 'files'}, {rule.maxBytes / (1024 * 1024)} MB each ({rule.extensions.join(', ')}).
            </Typography>

            <Stack spacing={0.5} sx={{ mb: 1 }}>
                {mine.map((file) => (
                    <Stack key={file.assetId} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                            {file.name}
                            {file.sizeBytes ? ` (${formatBytes(file.sizeBytes)})` : ''}
                        </Typography>

                        <IconButton size="small" aria-label={`Remove ${file.name}`} disabled={busy || disabled} onClick={() => handleDelete(file)}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                ))}
            </Stack>

            <input ref={input} type="file" hidden multiple={rule.max > 1} accept={rule.accept} onChange={handleChosen} />

            <Button size="small" variant={enough ? 'outlined' : 'contained'} disabled={busy || disabled || mine.length >= rule.max} onClick={() => input.current?.click()}>
                {rule.max === 1 ? 'Choose file' : 'Add files'}
            </Button>

            {busy && <LinearProgress sx={{ mt: 1 }} />}

            {message && (
                <Alert severity="error" sx={{ mt: 1, fontSize: '0.8125rem' }}>
                    {message}
                </Alert>
            )}
        </Box>
    );
}

function FosterFilesStep({ catId, files, onFilesChange, disabled = false }) {
    return (
        <Stack spacing={3}>
            {FOSTER_FILE_KINDS.map((kind) => (
                <KindSection key={kind} catId={catId} kind={kind} files={files} onFilesChange={onFilesChange} disabled={disabled} />
            ))}
        </Stack>
    );
}

export default FosterFilesStep;
