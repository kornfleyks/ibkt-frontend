import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button
} from '@mui/material';

import { useAuth } from '../../context/AuthContext';


function Login() {

    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');


    function handleLogin() {

        // Mock login

        login({

            id: 1,

            firstName: 'Vasilis',

            lastName: 'Kifonidis',

            email,

            role: 'Administrator',

            permissions: [

                'cats.read',
                'cats.write',
                'users.manage'

            ]

        });

        navigate('/dashboard');

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

                        onChange={(e)=>setEmail(e.target.value)}

                        sx={{ mb:3 }}

                    />




                    <TextField

                        fullWidth

                        type="password"

                        label="Password"

                        value={password}

                        onChange={(e)=>setPassword(e.target.value)}

                        sx={{ mb:4 }}

                    />




                    <Button

                        fullWidth

                        variant="contained"

                        onClick={handleLogin}

                    >

                        Sign In

                    </Button>


                </CardContent>

            </Card>

        </Box>

    );

}


export default Login;