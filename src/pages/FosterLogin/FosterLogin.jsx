import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { Box, TextField, Button, Alert, Link } from '@mui/material';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import PasswordField from '../../components/Common/PasswordField';
import useAuth from '../../hooks/useAuth';
import { readSignOutReason, clearSignOutReason } from '../../services/authStorage';

// The foster portal's own sign-in page. It asks the server to sign in as a
// foster: a staff account is refused here, and a foster is refused on the
// main sign-in page (server/index.js, POST /api/login).
function FosterLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    // e.g. "Your password is set" from the set-password page.
    const notice = useLocation().state?.notice;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loggingIn, setLoggingIn] = useState(false);
    const [signOutReason] = useState(readSignOutReason);
    const bothFilled = Boolean(email.trim() && password);

    useEffect(() => {
        clearSignOutReason();
    }, []);

    async function handleLogin() {
        if (!bothFilled) {
            setError('Email and password are required.');
            return;
        }

        setLoggingIn(true);
        setError(null);

        try {
            await login(email, password, { portal: 'foster' });
            navigate('/foster');
        } catch (err) {
            setError(err.message || 'Login failed.');
        } finally {
            setLoggingIn(false);
        }
    }

    return (
        <AuthLayout title="Foster Sign In">
            <TextField
                fullWidth
                required
                label="Email"
                value={email}
                disabled={loggingIn}
                onChange={(event) => setEmail(event.target.value)}
                sx={{ mb: 3 }}
            />

            <PasswordField
                fullWidth
                required
                label="Password"
                value={password}
                disabled={loggingIn}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleLogin()}
                sx={{ mb: 1 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Link component={RouterLink} to="/become-a-foster" variant="body2" sx={{ color: 'info.main' }}>
                    Become a foster
                </Link>
                <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ color: 'info.main' }}>
                    Forgot password?
                </Link>
            </Box>

            {notice && !error && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    {notice}
                </Alert>
            )}

            {signOutReason && !error && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {signOutReason}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Button fullWidth variant="contained" onClick={handleLogin} disabled={loggingIn || !bothFilled}>
                {loggingIn ? 'Signing In...' : 'Sign In'}
            </Button>
        </AuthLayout>
    );
}

export default FosterLogin;
