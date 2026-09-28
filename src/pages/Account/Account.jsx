import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import PageHeader from '../../components/PageHeader';
import ProfileDetailsCard from '../../components/Account/ProfileDetailsCard';
import EmailChangeCard from '../../components/Account/EmailChangeCard';
import PasswordChangeCard from '../../components/Account/PasswordChangeCard';
import AppearanceCard from '../../components/Account/AppearanceCard';
import DateFormatCard from '../../components/Account/DateFormatCard';
import SessionCard from '../../components/Account/SessionCard';
import { getAccount } from '../../services/AccountService';
import usePreferences from '../../hooks/usePreferences';
import useTabParam from '../../hooks/useTabParam';

// The header's account menu opens these with ?tab=profile / ?tab=settings.
const ACCOUNT_TABS = [
    { slug: 'profile', label: 'Profile' },
    { slug: 'settings', label: 'Settings' },
];

// The signed-in user's own account. Distinct from the Admin-only App
// Settings page (/settings), which holds app-wide settings.
function Account() {
    const [tab, setTab] = useTabParam(ACCOUNT_TABS);
    const { saveError } = usePreferences();
    const [account, setAccount] = useState(null);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        getAccount()
            .then((loaded) => !cancelled && setAccount(loaded))
            .catch((err) => !cancelled && setLoadError(err.message || 'Failed to load your account.'));

        return () => {
            cancelled = true;
        };
    }, []);

    function mergeAccount(changes) {
        setAccount((current) => ({ ...current, ...changes }));
    }

    const profileTab = loadError ? (
        <Alert severity="error">{loadError}</Alert>
    ) : !account ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
        </Box>
    ) : (
        <Stack spacing={3}>
            <ProfileDetailsCard account={account} onSaved={mergeAccount} />
            <EmailChangeCard account={account} onChanged={mergeAccount} />
            <PasswordChangeCard />
        </Stack>
    );

    const settingsTab = (
        <Stack spacing={3}>
            {saveError && <Alert severity="error">Your last change couldn't be saved: {saveError}</Alert>}
            <AppearanceCard />
            <DateFormatCard />
            <SessionCard lastLogin={account ? account.lastLogin : undefined} />
        </Stack>
    );

    return (
        <>
            <PageHeader title="My Account" subtitle="Your profile and personal settings" />

            <Box sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(event, newValue) => setTab(newValue)}>
                    {ACCOUNT_TABS.map((accountTab) => (
                        <Tab key={accountTab.slug} label={accountTab.label} />
                    ))}
                </Tabs>
            </Box>

            <Box sx={{ maxWidth: 760 }}>
                {tab === 0 ? profileTab : settingsTab}
            </Box>
        </>
    );
}

export default Account;
