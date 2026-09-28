import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import SectionCard from '../Common/SectionCard';
import usePreferences from '../../hooks/usePreferences';
import { DATE_FORMATS } from '../../constants/preferences';
import { formatDate } from '../../utils/formatDate';

function DateFormatCard() {
    const { preferences, setPreference } = usePreferences();
    const today = new Date();

    return (
        <SectionCard title="Date format">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                How dates are shown across the app.
            </Typography>

            <RadioGroup
                value={preferences.dateFormat}
                onChange={(event) => setPreference('dateFormat', event.target.value)}
            >
                {Object.values(DATE_FORMATS).map((format) => (
                    <FormControlLabel
                        key={format}
                        value={format}
                        control={<Radio />}
                        label={`${format} (today: ${formatDate(today, format)})`}
                    />
                ))}
            </RadioGroup>
        </SectionCard>
    );
}

export default DateFormatCard;
