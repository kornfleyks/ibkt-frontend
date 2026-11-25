import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControl, FormControlLabel, FormGroup, FormHelperText, Stack, TextField, Typography } from '@mui/material';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import { agreementFileUrl, getAgreement, signAgreement } from '../../services/RescuerAgreementService';

// The public page where an approved rescuer signs the Rescuer Agreement,
// opened from the link in the email (/rescuer-agreement/:code), no sign-in
// (docs/rescuer-agreement.md). The person ticks at least one point and types
// their full name. Signing uses the link up and opens the sign-up page.
function RescuerAgreement() {
    const { code } = useParams();
    const navigate = useNavigate();
    const [agreement, setAgreement] = useState(null);
    // 'loading' | 'open' | 'gone'
    const [state, setState] = useState('loading');
    const [ticked, setTicked] = useState([]);
    const [typedName, setTypedName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        getAgreement(code)
            .then((data) => {
                if (cancelled) return;

                setAgreement(data);
                setState('open');
            })
            .catch((err) => {
                console.error('Failed to open the agreement link:', err);

                if (cancelled) return;

                setError(err.message);
                setState('gone');
            });

        return () => {
            cancelled = true;
        };
    }, [code]);

    function toggle(id) {
        setTicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    }

    async function handleSign() {
        if (ticked.length === 0) {
            setError('Tick at least one point to sign.');
            return;
        }

        if (typedName.trim().length < 2) {
            setError('Type your full name to sign.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { signupCode } = await signAgreement(code, { typedName: typedName.trim(), points: ticked });

            navigate(`/become-a-rescuer/${encodeURIComponent(signupCode)}`, { replace: true });
        } catch (err) {
            console.error('Failed to sign the agreement:', err);

            if (err.status === 404) setState('gone');

            setError(err.message || 'Failed to sign the agreement.');
            setSaving(false);
        }
    }

    if (state === 'loading') {
        return (
            <AuthLayout title="Your Rescuer Agreement" width={520}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            </AuthLayout>
        );
    }

    if (state === 'gone') {
        return (
            <AuthLayout title="Your Rescuer Agreement" width={520}>
                <Alert severity="warning">{error}</Alert>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Your Rescuer Agreement" width={520}>
            <Stack spacing={3}>
                <Typography textAlign="center">
                    Welcome to the team{agreement.firstName ? `, ${agreement.firstName}` : ''}. One last step: read and sign the agreement. Next, you will receive a form to sign up, and then you can use Oriel.
                </Typography>

                <FormControl error={Boolean(error) && ticked.length === 0} component="fieldset" disabled={saving}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                        In short
                    </Typography>

                    <FormGroup>
                        {agreement.points.map((point) => (
                            <FormControlLabel
                                key={point.id}
                                control={<Checkbox checked={ticked.includes(point.id)} onChange={() => toggle(point.id)} />}
                                label={point.text}
                            />
                        ))}
                    </FormGroup>

                    <FormHelperText>Tick the points you agree to. You need to tick at least one.</FormHelperText>
                </FormControl>

                <Stack spacing={0.5} alignItems="center">
                    <Button variant="outlined" href={agreementFileUrl(agreement.file)} target="_blank" rel="noopener noreferrer">
                        Read the full agreement
                    </Button>

                    <Typography variant="caption" color="text.secondary">
                        Version {agreement.version}
                        {agreement.date ? `, ${agreement.date}` : ''}
                    </Typography>
                </Stack>

                <TextField
                    fullWidth
                    required
                    label="Type your full name to sign"
                    value={typedName}
                    disabled={saving}
                    onChange={(event) => setTypedName(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSign()}
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button variant="contained" onClick={handleSign} disabled={saving}>
                    {saving ? 'Signing...' : 'Sign the agreement'}
                </Button>

                <Typography variant="caption" color="text.secondary" textAlign="center">
                    You will get a signed copy by email. Oriel keeps a record of the version you signed.
                </Typography>
            </Stack>
        </AuthLayout>
    );
}

export default RescuerAgreement;
