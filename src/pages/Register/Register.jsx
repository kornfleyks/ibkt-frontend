import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Link
} from '@mui/material';

import { register } from '../../services/AuthService';

const initialForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
};

function Register() {

    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit() {

        if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
            setError('All fields are required.');
            return;
        }

        if (form.password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (!form.inviteCode.trim()) {
            setError('An invite code is required.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {

            await register({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                password: form.password,
                inviteCode: form.inviteCode,
            });

            setSubmitted(true);

        } catch (err) {

            setError(err.message || 'Registration failed.');

        } finally {

            setSubmitting(false);

        }

    }

    return (

        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >

            <Card sx={{ width: 420 }}>

                <CardContent>

                    <Typography variant="h4" textAlign="center" fontWeight={600}>
                        IBKT
                    </Typography>

                    <Typography textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
                        Create an account
                    </Typography>

                    {submitted ? (
                        <>
                            <Alert severity="success" sx={{ mb: 3 }}>
                                Account created. An admin needs to approve it before you can sign in.
                            </Alert>

                            <Typography textAlign="center">
                                <Link component={RouterLink} to="/login" sx={{ color: 'info.main' }}>
                                    Back to Sign In
                                </Link>
                            </Typography>
                        </>
                    ) : (
                        <>
                            <TextField
                                fullWidth
                                label="First Name"
                                value={form.firstName}
                                disabled={submitting}
                                onChange={(e) => setField('firstName', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                label="Last Name"
                                value={form.lastName}
                                disabled={submitting}
                                onChange={(e) => setField('lastName', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                label="Email"
                                value={form.email}
                                disabled={submitting}
                                onChange={(e) => setField('email', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                type="password"
                                label="Password"
                                value={form.password}
                                disabled={submitting}
                                onChange={(e) => setField('password', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                type="password"
                                label="Confirm Password"
                                value={form.confirmPassword}
                                disabled={submitting}
                                onChange={(e) => setField('confirmPassword', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                label="Invite Code"
                                value={form.inviteCode}
                                disabled={submitting}
                                onChange={(e) => setField('inviteCode', e.target.value)}
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
                                {submitting ? 'Creating Account...' : 'Create Account'}
                            </Button>

                            <Typography textAlign="center" sx={{ mt: 3 }}>
                                <Link component={RouterLink} to="/login" sx={{ color: 'info.main' }}>
                                    Back to Sign In
                                </Link>
                            </Typography>
                        </>
                    )}

                </CardContent>

            </Card>

        </Box>

    );

}

export default Register;
