import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';

import useDateFormat from '../../hooks/useDateFormat';
import { catShareUrl, createCatShareLink } from '../../services/CatShareLinkService';

// Makes a single-use link to the Add Cat form for someone without an
// account, and shows it to copy. The person making it says who the link is
// for: a foster (the form asks which foster, and links the cat to them) or a
// rescuer. Shown to rescuers, Admins and Super Admins (the server checks the
// role too).
function ShareCatFormButton() {
    const { formatDateTime } = useDateFormat();
    const [choosing, setChoosing] = useState(false);
    const [audience, setAudience] = useState('foster');
    const [creating, setCreating] = useState(false);
    const [link, setLink] = useState(null);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    async function create() {
        setCreating(true);
        setError(null);
        setCopied(false);

        try {
            const { code, expiresAt } = await createCatShareLink(audience);

            setChoosing(false);
            setLink({ url: catShareUrl(code), expiresAt });
        } catch (err) {
            console.error('Failed to create the shareable link:', err);
            setError(err.message || 'Failed to create the link.');
        } finally {
            setCreating(false);
        }
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(link.url);
            setCopied(true);
        } catch {
            // Clipboard blocked: the person can still select the text.
            setError('Could not copy automatically. Select the link and copy it.');
        }
    }

    function close() {
        setLink(null);
        setError(null);
    }

    return (
        <>
            <Button variant="outlined" onClick={() => { setError(null); setChoosing(true); }}>
                Create Shareable Link
            </Button>

            <Dialog open={choosing} onClose={() => !creating && setChoosing(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Who is the link for?</DialogTitle>

                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <FormControl>
                            <FormLabel id="share-audience">The person who will fill in the form is</FormLabel>
                            <RadioGroup aria-labelledby="share-audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
                                <FormControlLabel value="foster" control={<Radio />} label="A foster (the form asks which foster)" />
                                <FormControlLabel value="rescuer" control={<Radio />} label="A rescuer" />
                            </RadioGroup>
                        </FormControl>

                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setChoosing(false)} disabled={creating}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={create} disabled={creating}>
                        {creating ? 'Creating...' : 'Create Link'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(link)} onClose={close} maxWidth="sm" fullWidth>
                <DialogTitle>Shareable Add Cat link</DialogTitle>

                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Typography variant="body2">
                            Send this link to the person who will fill in the form. It can be used for one cat only.
                            {link && ` It expires on ${formatDateTime(link.expiresAt)}.`}
                        </Typography>

                        <TextField fullWidth size="small" value={link?.url ?? ''} slotProps={{ input: { readOnly: true } }} onFocus={(event) => event.target.select()} />

                        {copied && <Alert severity="success">Link copied.</Alert>}
                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={close}>Close</Button>
                    <Button variant="contained" onClick={copy}>
                        Copy Link
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default ShareCatFormButton;
