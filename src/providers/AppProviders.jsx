import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { ThemeProvider as CustomThemeProvider } from "../context/ThemeContext";
import { useThemeMode } from "../context/ThemeContext";
import { LayoutProvider } from "../context/LayoutContext";
import { LoadingProvider } from "../context/LoadingContext";
import { AuthProvider } from "../context/AuthContext";

import ErrorBoundary from "../components/ErrorBoundary/ErrorBoundary";
import LoadingRoot from "../components/LoadingOverlay/LoadingRoot";

import { buildTheme } from "../themes/theme";


function Providers({ children }) {

    const { darkMode } = useThemeMode();

    const theme = buildTheme(darkMode);

    return (

        <ThemeProvider theme={theme}>

            <CssBaseline />

            <LayoutProvider>

                <AuthProvider>

                    <LoadingProvider>

                        <LoadingRoot />

                        <ErrorBoundary>

                            {children}

                        </ErrorBoundary>

                    </LoadingProvider>

                </AuthProvider>

            </LayoutProvider>

        </ThemeProvider>

    );

}


function AppProviders({ children }) {

    return (

        <CustomThemeProvider>

            <Providers>

                {children}

            </Providers>

        </CustomThemeProvider>

    );

}


export default AppProviders;