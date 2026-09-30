import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
    Typography,
    TextField,
    Button,
    Alert,
    Link
} from '@mui/material';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import { requestPasswordReset } from '../../services/AuthService';

function ForgotPassword() {

    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit() {

        if (!email.trim()) {
            setError('Enter your email address.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {

            await requestPasswordReset(email.trim());

            setSubmitted(true);

        } catch (err) {

            setError(err.message || 'Could not request a password reset.');

        } finally {

            setSubmitting(false);

        }

    }

    return (

        <AuthLayout title="Reset Password">

                    {submitted ? (
                        // Same message whether or not the email has an
                        // account - the server doesn't say either.
                        <Alert severity="success" sx={{ mb: 3 }}>
                            If an active account uses {email.trim()}, we've emailed it a link to reset
                            the password. The link works for 15 minutes. Check your spam folder if it
                            doesn't arrive, or request another one after 15 minutes.
                        </Alert>
                    ) : (
                        <>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                Enter the email you sign in with and we'll send you a link to set a new password.
                            </Typography>

                            <TextField
                                fullWidth
                                type="email"
                                label="Email"
                                value={email}
                                disabled={submitting}
                                onChange={(e) => setEmail(e.target.value)}
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
                                {submitting ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        </>
                    )}

                    <Typography textAlign="center" sx={{ mt: 3 }}>
                        <Link component={RouterLink} to="/login" sx={{ color: 'info.main' }}>
                            Back to Sign In
                        </Link>
                    </Typography>

        </AuthLayout>

    );

}

export default ForgotPassword;
