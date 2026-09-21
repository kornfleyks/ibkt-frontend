import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

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

import useAuth from '../../hooks/useAuth';


function Login() {

    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loggingIn, setLoggingIn] = useState(false);


    async function handleLogin() {

        if (!email.trim() || !password) {
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

        <Box

            sx={{

                minHeight: '100vh',

                display: 'flex',

                justifyContent: 'center',

                alignItems: 'center'

            }}

        >

            <Card

                sx={{

                    width: 400

                }}

            >

                <CardContent>


                    <Typography

                        variant="h4"

                        textAlign="center"

                        fontWeight={600}

                    >

                        IBKT

                    </Typography>



                    <Typography

                        textAlign="center"

                        color="text.secondary"

                        sx={{ mb: 4 }}

                    >

                        International Boarding of Kitties Team

                    </Typography>




                    <TextField

                        fullWidth

                        label="Email"

                        value={email}

                        disabled={loggingIn}

                        onChange={(e)=>setEmail(e.target.value)}

                        sx={{ mb:3 }}

                    />




                    <TextField

                        fullWidth

                        type="password"

                        label="Password"

                        value={password}

                        disabled={loggingIn}

                        onChange={(e)=>setPassword(e.target.value)}

                        sx={{ mb:3 }}

                    />

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}


                    <Button

                        fullWidth

                        variant="contained"

                        onClick={handleLogin}

                        disabled={loggingIn}

                    >

                        {loggingIn ? 'Signing In...' : 'Sign In'}

                    </Button>

                    <Typography textAlign="center" sx={{ mt: 3 }}>
                        <Link component={RouterLink} to="/register" sx={{ color: 'info.main' }}>
                            Create an account
                        </Link>
                    </Typography>


                </CardContent>

            </Card>

        </Box>

    );

}


export default Login;
