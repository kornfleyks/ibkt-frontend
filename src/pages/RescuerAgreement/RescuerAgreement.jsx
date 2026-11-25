import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, CircularProgress, Divider, FormControl, FormControlLabel, FormGroup, FormHelperText, Stack, TextField, Typography } from '@mui/material';

import BrandMark from '../../components/Brand/BrandMark';
import BrandFooter from '../../components/Brand/BrandFooter';
import { agreementFileUrl, getAgreement, signAgreement } from '../../services/RescuerAgreementService';

// The page's frame (Oriel mock-up "Sign the agreement"): the seal on Cream, a
// narrow column that works on a phone, and the Midnight footer band.
function Frame({ children }) {
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Box component="main" sx={{ flex: 1, width: '100%', maxWidth: 560, mx: 'auto', px: 2.5, py: 4 }}>
                <Stack spacing={3} sx={{ alignItems: 'center' }}>
                    <BrandMark variant="seal" width={160} />

                    {children}
                </Stack>
            </Box>

            <BrandFooter />
        </Box>
    );
}

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
            <Frame>
                <CircularProgress sx={{ color: 'text.secondary' }} />
            </Frame>
        );
    }

    if (state === 'gone') {
        return (
            <Frame>
                <Typography variant="h2" component="h1" sx={{ textAlign: 'center' }}>
                    Your Rescuer Agreement
                </Typography>

                <Alert severity="warning" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Frame>
        );
    }

    return (
        <Frame>
            <Typography sx={{ fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mt: -1 }}>
                Approved by Mia
            </Typography>

            <Typography variant="h2" component="h1" sx={{ textAlign: 'center', fontSize: { xs: '2.5rem', sm: '3rem' } }}>
                Your Rescuer Agreement
            </Typography>

            <Typography sx={{ textAlign: 'center', fontSize: '1.0625rem', lineHeight: 1.6 }}>
                Welcome to the team{agreement.firstName ? `, ${agreement.firstName}` : ''}. One last step: read and sign the agreement. Next, you will receive a form to sign up, and then you can use Oriel.
            </Typography>

            <FormControl
                component="div"
                role="group"
                aria-labelledby="agreement-points-title"
                error={Boolean(error) && ticked.length === 0}
                disabled={saving}
                sx={{ width: '100%', bgcolor: 'action.selected', borderRadius: 4, p: 3 }}
            >
                <Typography id="agreement-points-title" variant="h5" component="h2" sx={{ mb: 1 }}>
                    In short
                </Typography>

                <FormGroup>
                    {agreement.points.map((point) => (
                        <FormControlLabel
                            key={point.id}
                            control={<Checkbox checked={ticked.includes(point.id)} onChange={() => toggle(point.id)} />}
                            label={point.text}
                            sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.5 } }}
                        />
                    ))}
                </FormGroup>

                <FormHelperText sx={{ mx: 0, mt: 1.5 }}>Tick the points you agree to. You need to tick at least one.</FormHelperText>
            </FormControl>

            <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
                <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    href={agreementFileUrl(agreement.file)}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Read the full agreement
                </Button>

                <Typography variant="body2" color="text.secondary">
                    Version {agreement.version}
                    {agreement.date ? `, ${agreement.date}` : ''}
                </Typography>
            </Stack>

            <Divider flexItem />

            <Stack spacing={1} sx={{ width: '100%' }}>
                <Typography component="label" htmlFor="agreement-typed-name" sx={{ fontWeight: 700 }}>
                    Type your full name to sign
                </Typography>

                <TextField
                    id="agreement-typed-name"
                    fullWidth
                    required
                    value={typedName}
                    disabled={saving}
                    onChange={(event) => setTypedName(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && handleSign()}
                    slotProps={{ htmlInput: { maxLength: 255 } }}
                />
            </Stack>

            {error && (
                <Alert severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            )}

            <Button variant="contained" size="large" fullWidth onClick={handleSign} disabled={saving}>
                {saving ? 'Signing...' : 'Sign the agreement'}
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                You will get a signed copy by email. Oriel keeps a record of the version you signed.
            </Typography>
        </Frame>
    );
}

export default RescuerAgreement;
