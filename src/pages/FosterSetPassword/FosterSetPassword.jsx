import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { Typography, TextField, Button, Alert, Link } from '@mui/material';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import { confirmPasswordReset } from '../../services/AuthService';

// Opened from the approval email: /foster/set-password?code=... The foster
// chooses their first password here (the link works for 7 days and once).
// Uses the same server step as a password reset.
function FosterSetPassword() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Read once, then dropped from the address bar so the code doesn't stay
    // in the browser history.
    const [code] = useState(() => searchParams.get('code') ?? '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (searchParams.has('code')) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    async function handleSubmit() {
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await confirmPasswordReset(code, password);

            navigate('/foster/login', {
                replace: true,
                state: { notice: 'Your password is set. Sign in to get started.' },
            });
        } catch (err) {
            setError(err.message || 'Failed to set your password.');
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout title="Choose Your Password">
            {!code ? (
                <Alert severity="error" sx={{ mb: 3 }}>
                    This link is incomplete. Open the link from your email again, or ask IBKT to send you a new one.
                </Alert>
            ) : (
                <>
                    <TextField
                        fullWidth
                        type="password"
                        label="Password"
                        value={password}
                        disabled={submitting}
                        onChange={(event) => setPassword(event.target.value)}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        type="password"
                        label="Confirm Password"
                        value={confirmPassword}
                        disabled={submitting}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
                        sx={{ mb: 3 }}
                    />

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    <Button fullWidth variant="contained" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Saving...' : 'Set Password'}
                    </Button>
                </>
            )}

            <Typography textAlign="center" sx={{ mt: 3 }}>
                <Link component={RouterLink} to="/foster/login" sx={{ color: 'info.main' }}>
                    Back to Sign In
                </Link>
            </Typography>
        </AuthLayout>
    );
}

export default FosterSetPassword;
