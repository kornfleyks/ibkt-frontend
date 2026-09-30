import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';

import {
    Box,
    TextField,
    Button,
    Alert,
    Link
} from '@mui/material';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import PasswordField from '../../components/Common/PasswordField';
import useAuth from '../../hooks/useAuth';
import { readSignOutReason, clearSignOutReason } from '../../services/authStorage';


function Login() {

    const { login } = useAuth();
    const navigate = useNavigate();
    // e.g. "Your password has been reset" from the Reset Password page.
    const notice = useLocation().state?.notice;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loggingIn, setLoggingIn] = useState(false);
    // Why the previous session ended (e.g. account suspended), shown once.
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

            await login(email, password);

            navigate('/dashboard');

        } catch (err) {

            setError(err.message || 'Login failed.');

        } finally {

            setLoggingIn(false);

        }

    }


    return (

        <AuthLayout title="Sign In">

                    <TextField

                        fullWidth

                        required

                        label="Email"

                        value={email}

                        disabled={loggingIn}

                        onChange={(e)=>setEmail(e.target.value)}

                        sx={{ mb:3 }}

                    />




                    <PasswordField

                        fullWidth

                        required

                        label="Password"

                        value={password}

                        disabled={loggingIn}

                        onChange={(e)=>setPassword(e.target.value)}

                        sx={{ mb:1 }}

                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                        <Link component={RouterLink} to="/register" variant="body2" sx={{ color: 'info.main' }}>
                            Create an account
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


                    <Button

                        fullWidth

                        variant="contained"

                        onClick={handleLogin}

                        disabled={loggingIn || !bothFilled}

                    >

                        {loggingIn ? 'Signing In...' : 'Sign In'}

                    </Button>

        </AuthLayout>

    );

}


export default Login;
