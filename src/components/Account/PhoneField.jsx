import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { COUNTRY_OPTIONS } from '../../utils/phone';

// Country (with dialling code) + national number. Monday's phone column
// needs the country with every number. value: { country, number }.
function PhoneField({ value, onChange, disabled = false }) {
    const selected = COUNTRY_OPTIONS.find((option) => option.code === value.country) ?? null;

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Autocomplete
                options={COUNTRY_OPTIONS}
                value={selected}
                disabled={disabled}
                onChange={(event, option) => onChange({ ...value, country: option?.code ?? '' })}
                getOptionLabel={(option) => `${option.name} (+${option.dialCode})`}
                isOptionEqualToValue={(option, current) => option.code === current.code}
                sx={{ minWidth: 260 }}
                renderInput={(params) => <TextField {...params} label="Country" />}
            />

            <TextField
                fullWidth
                label="Phone number"
                value={value.number}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, number: event.target.value })}
                helperText="Without the country code or a leading 0"
                slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'tel-national' } }}
            />
        </Stack>
    );
}

export default PhoneField;
