import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';

import {
    Typography,
    TextField,
    Button,
    Alert,
    Link
} from '@mui/material';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import { confirmPasswordReset } from '../../services/AuthService';

// Opened from the reset email: /reset-password?code=...
function ResetPassword() {

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

            navigate('/login', {
                replace: true,
                state: { notice: 'Your password has been reset. Sign in with your new password.' },
            });

        } catch (err) {

            setError(err.message || 'Failed to reset your password.');
            setSubmitting(false);

        }

    }

    return (

        <AuthLayout title="Choose a New Password">

                    {!code ? (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            This reset link is incomplete. Open the link from your email again, or{' '}
                            <Link component={RouterLink} to="/forgot-password">request a new one</Link>.
                        </Alert>
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                type="password"
                                label="New Password"
                                value={password}
                                disabled={submitting}
                                onChange={(e) => setPassword(e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                type="password"
                                label="Confirm New Password"
                                value={confirmPassword}
                                disabled={submitting}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                sx={{ mb: 3 }}
                            />

                            {error && (
                                <Alert severity="error" sx={{ mb: 3 }}>
                                    {error}
                                </Alert>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Saving...' : 'Set New Password'}
                            </Button>
                        </>
                    )}

                    <Typography textAlign="center" sx={{ mt: 3 }}>
                        <Link component={RouterLink} to="/forgot-password" sx={{ color: 'info.main' }}>
                            Request a new link
                        </Link>
                        {' · '}
                        <Link component={RouterLink} to="/login" sx={{ color: 'info.main' }}>
                            Back to Sign In
                        </Link>
                    </Typography>

        </AuthLayout>

    );

}

export default ResetPassword;
