import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import SectionCard from '../Common/SectionCard';
import { useThemeMode } from '../../context/ThemeContext';
import usePreferences from '../../hooks/usePreferences';

// The only place to change dark mode; saved to the account.
function AppearanceCard() {
    const { darkMode } = useThemeMode();
    const { setPreference } = usePreferences();

    return (
        <SectionCard title="Appearance">
            <FormControlLabel
                control={
                    <Switch
                        checked={darkMode}
                        onChange={(event) => setPreference('darkMode', event.target.checked)}
                    />
                }
                label="Dark mode"
            />

            <Typography variant="body2" color="text.secondary">
                Saved to your account, so it follows you to any device you sign in on.
            </Typography>
        </SectionCard>
    );
}

export default AppearanceCard;
