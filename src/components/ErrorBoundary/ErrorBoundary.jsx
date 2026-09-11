import React from "react";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

class ErrorBoundary extends React.Component {

    constructor(props) {

        super(props);

        this.state = {
            hasError: false
        };

    }


    static getDerivedStateFromError() {

        return {
            hasError: true
        };

    }


    componentDidCatch(error, errorInfo) {

        console.error(
            "Application Error",
            error,
            errorInfo
        );

    }


    render() {

        if (this.state.hasError) {

            return (

                <Box
                    sx={{
                        height: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 2
                    }}
                >

                    <Typography
                        variant="h4"
                    >
                        Something went wrong
                    </Typography>


                    <Typography
                        color="text.secondary"
                    >
                        An unexpected error occurred.
                    </Typography>


                    <Button
                        variant="contained"
                        onClick={() => window.location.reload()}
                    >
                        Reload
                    </Button>

                </Box>

            );

        }


        return this.props.children;

    }

}

export default ErrorBoundary;