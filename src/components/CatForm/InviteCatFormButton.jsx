import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, Stack, TextField } from '@mui/material';

import { inviteToAddCat } from '../../services/CatShareLinkService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// What the result of the send means for the person who pressed Send.
function outcomeOf(email) {
    switch (email.status) {
        case 'sent':
            return { severity: 'success', text: 'The invitation was sent. The link works for 3 days; after that, send the invitation again.' };
        case 'skipped':
            return { severity: 'warning', text: 'The invitation was created but the email was not sent, because the email service is not set up on this server.' };
        default:
            return { severity: 'error', text: `The email could not be sent${email.error ? `: ${email.error}` : '.'}` };
    }
}

// "Invite to Add Cat": asks for a full name and an email and emails that
// person a single-use link to the Add Cat form (it expires after 3 days).
// The server records who sent it. Shown to rescuers, Admins and Super Admins
// (the server checks the role too).
function InviteCatFormButton() {
    const [open, setOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [audience, setAudience] = useState('foster');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [outcome, setOutcome] = useState(null);

    function close() {
        if (sending) return;

        setOpen(false);
        setFullName('');
        setEmail('');
        setAudience('foster');
        setError(null);
        setOutcome(null);
    }

    async function send() {
        if (!fullName.trim()) {
            setError("Enter the person's full name.");
            return;
        }

        if (!EMAIL_PATTERN.test(email.trim())) {
            setError('Enter a valid email address.');
            return;
        }

        setSending(true);
        setError(null);

        try {
            const result = await inviteToAddCat({ fullName: fullName.trim(), email: email.trim(), audience });

            setOutcome(outcomeOf(result.email));
        } catch (err) {
            console.error('Failed to send the invitation:', err);
            setError(err.message || 'Failed to send the invitation.');
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <Button variant="contained" onClick={() => setOpen(true)}>
                Invite to Add Cat
            </Button>

            <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
                <DialogTitle>Invite someone to add a cat</DialogTitle>

                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {outcome ? (
                            <Alert severity={outcome.severity}>{outcome.text}</Alert>
                        ) : (
                            <>
                                <TextField label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={sending} autoFocus fullWidth required />
                                <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={sending} fullWidth required />

                                <FormControl>
                                    <FormLabel id="invite-audience">This person is</FormLabel>
                                    <RadioGroup aria-labelledby="invite-audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
                                        <FormControlLabel value="foster" control={<Radio />} label="A foster (the form asks which foster)" disabled={sending} />
                                        <FormControlLabel value="rescuer" control={<Radio />} label="A rescuer" disabled={sending} />
                                    </RadioGroup>
                                </FormControl>

                                {error && <Alert severity="error">{error}</Alert>}
                            </>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={close} disabled={sending}>
                        {outcome ? 'Close' : 'Cancel'}
                    </Button>

                    {!outcome && (
                        <Button variant="contained" onClick={send} disabled={sending}>
                            {sending ? 'Sending...' : 'Send Invitation'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
}

export default InviteCatFormButton;
