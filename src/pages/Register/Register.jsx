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
    // Every field is required; passwords count as typed (spaces included).
    const allFilled = Boolean(
        form.firstName.trim() && form.lastName.trim() && form.email.trim()
        && form.password && form.confirmPassword && form.inviteCode.trim()
    );

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit() {

        if (!allFilled) {
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

        <AuthLayout title="Create Account" width={420}>

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
                                required
                                label="First Name"
                                value={form.firstName}
                                disabled={submitting}
                                onChange={(e) => setField('firstName', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                required
                                label="Last Name"
                                value={form.lastName}
                                disabled={submitting}
                                onChange={(e) => setField('lastName', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                required
                                label="Email"
                                value={form.email}
                                disabled={submitting}
                                onChange={(e) => setField('email', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                required
                                type="password"
                                label="Password"
                                value={form.password}
                                disabled={submitting}
                                onChange={(e) => setField('password', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                required
                                type="password"
                                label="Confirm Password"
                                value={form.confirmPassword}
                                disabled={submitting}
                                onChange={(e) => setField('confirmPassword', e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                required
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
                                disabled={submitting || !allFilled}
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

        </AuthLayout>

    );

}

export default Register;
