import { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';

import PhoneField from '../Account/PhoneField';
import { lookupSharedFoster } from '../../services/CatShareLinkService';

// "Who is the foster?" on a shareable Add Cat link made for a foster. The
// person types their email and we check it against our foster records
// (the page is told only found / not found, never who). A foster we find is
// linked to the cat; anyone else gives their name, surname and phone, and is
// added as "Not yet registered".
//
// value: { email, firstName, lastName, phone: { country, number } }
// lookup: undefined (not checked yet) | { found, eligible } for value.email.
function FosterIdentity({ code, value, onChange, lookup, onLookupChange, disabled }) {
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState(null);

    function setField(key, fieldValue) {
        onChange({ ...value, [key]: fieldValue });
    }

    function changeEmail(email) {
        // A different email needs a new check.
        if (lookup) onLookupChange(undefined);

        setField('email', email);
    }

    async function check() {
        setChecking(true);
        setError(null);

        try {
            onLookupChange(await lookupSharedFoster(code, value.email));
        } catch (err) {
            setError(err.message || 'Could not check the email. Try again.');
        } finally {
            setChecking(false);
        }
    }

    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">Who is fostering this cat?</Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label="Foster's email"
                    value={value.email}
                    disabled={disabled || checking}
                    onChange={(event) => changeEmail(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && value.email.trim() && !lookup && check()}
                />

                <Button variant="outlined" onClick={check} disabled={disabled || checking || !value.email.trim() || Boolean(lookup)}>
                    {checking ? 'Checking...' : 'Check'}
                </Button>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            {lookup?.found && lookup.eligible && <Alert severity="success">We found this foster in our records. The cat will be linked to them.</Alert>}

            {lookup?.found && !lookup.eligible && (
                <Alert severity="warning">We found a foster record for this email, but it isn&apos;t active. Please contact IBKT.</Alert>
            )}

            {lookup && !lookup.found && (
                <>
                    <Alert severity="info">We couldn&apos;t find this email in our foster records. Please add the foster&apos;s details.</Alert>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <TextField fullWidth size="small" required label="First name" value={value.firstName} disabled={disabled} onChange={(event) => setField('firstName', event.target.value)} />
                        <TextField fullWidth size="small" required label="Surname" value={value.lastName} disabled={disabled} onChange={(event) => setField('lastName', event.target.value)} />
                    </Stack>

                    <PhoneField required value={value.phone} onChange={(phone) => setField('phone', phone)} disabled={disabled} />
                </>
            )}
        </Stack>
    );
}

export default FosterIdentity;
