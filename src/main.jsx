import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The brand typefaces, served with the app (not from Google): Barlow Condensed
// for headings, Nunito Sans for everything else (themes/brandTokens.js).
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/nunito-sans/400.css';
import '@fontsource/nunito-sans/600.css';
import '@fontsource/nunito-sans/700.css';

import App from './App';
import AppProviders from './providers/AppProviders';


createRoot(document.getElementById('root')).render(

    <StrictMode>

        <AppProviders>

            <App />

        </AppProviders>

    </StrictMode>

);