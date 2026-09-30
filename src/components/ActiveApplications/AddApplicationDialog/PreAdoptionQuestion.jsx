import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PhoneField from '../../Account/PhoneField';
import { UploadIcon } from '../../icons';
import { COUNTRY_OPTIONS } from '../../../utils/phone';
import { PHOTO_EXTENSIONS } from '../../../constants/forms/preAdoptionForm';

// One Pre-Adoption Form question (constants/forms/preAdoptionForm.js),
// drawn by its type. `value` / `onChange` are this question's answer;
// `error` its message. Photos are File objects kept by the dialog.
// `readOnly` (Preview): every field is disabled (and read-only); the
// Preview dialog keeps the disabled text readable.
function PreAdoptionQuestion({ question, value, onChange = () => {}, error, disabled = false, readOnly = false }) {
    const { label, subLabel, options, required } = question;
    const helper = error || subLabel;
    const locked = disabled || readOnly;
    const textSlot = readOnly ? { input: { readOnly: true } } : undefined;

    switch (question.type) {
        case 'note':
            return <Alert severity="info">{label}</Alert>;

        case 'select':
            return (
                <TextField
                    select
                    fullWidth
                    required={required}
                    label={label}
                    value={value ?? ''}
                    disabled={locked}
                    error={Boolean(error)}
                    helperText={helper}
                    onChange={(event) => onChange(event.target.value)}
                >
                    <MenuItem value="">
                        <em>Please Select</em>
                    </MenuItem>
                    {options.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </TextField>
            );

        case 'radio':
            return (
                <FormControl required={required} error={Boolean(error)} disabled={locked}>
                    <FormLabel>{label}</FormLabel>
                    <RadioGroup value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
                        {options.map((option) => (
                            <FormControlLabel key={option} value={option} control={<Radio size="small" />} label={option} />
                        ))}
                    </RadioGroup>
                    {helper && <FormHelperText>{helper}</FormHelperText>}
                </FormControl>
            );

        case 'checkbox': {
            const picked = Array.isArray(value) ? value : [];

            function toggle(option) {
                onChange(picked.includes(option) ? picked.filter((item) => item !== option) : [...picked, option]);
            }

            return (
                <FormControl required={required} error={Boolean(error)} disabled={locked} component="fieldset">
                    <FormLabel component="legend">{label}</FormLabel>
                    <FormGroup>
                        {options.map((option) => (
                            <FormControlLabel
                                key={option}
                                control={<Checkbox size="small" checked={picked.includes(option)} onChange={() => toggle(option)} />}
                                label={option}
                            />
                        ))}
                    </FormGroup>
                    {helper && <FormHelperText>{helper}</FormHelperText>}
                </FormControl>
            );
        }

        case 'textarea':
            return (
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    required={required}
                    label={label}
                    value={value ?? ''}
                    disabled={locked}
                    error={Boolean(error)}
                    helperText={helper}
                    onChange={(event) => onChange(event.target.value)}
                    slotProps={textSlot}
                />
            );

        case 'number':
            return (
                <TextField
                    fullWidth
                    type="number"
                    required={required}
                    label={label}
                    value={value ?? ''}
                    disabled={locked}
                    error={Boolean(error)}
                    helperText={helper}
                    onChange={(event) => onChange(event.target.value)}
                    slotProps={{ ...textSlot, htmlInput: { min: 0, step: 'any' } }}
                />
            );

        case 'fullName': {
            const name = value ?? { first: '', last: '' };

            return (
                <FormControl required={required} error={Boolean(error)} disabled={locked} fullWidth>
                    <FormLabel sx={{ mb: 1.5 }}>{label}</FormLabel>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField fullWidth required={required} label="First Name" value={name.first} disabled={locked} slotProps={textSlot} error={Boolean(error) && !name.first?.trim()} onChange={(event) => onChange({ ...name, first: event.target.value })} />
                        <TextField fullWidth required={required} label="Last Name" value={name.last} disabled={locked} slotProps={textSlot} error={Boolean(error) && !name.last?.trim()} onChange={(event) => onChange({ ...name, last: event.target.value })} />
                    </Stack>
                    {error && <FormHelperText>{error}</FormHelperText>}
                </FormControl>
            );
        }

        case 'address': {
            const address = value ?? {};
            const set = (part) => (event) => onChange({ ...address, [part]: event.target.value });
            const country = COUNTRY_OPTIONS.find((option) => option.code === address.country) ?? null;
            // After a failed check, outline the required parts still empty.
            const missing = (part) => Boolean(error) && !String(address[part] ?? '').trim();

            // Jotform requires Street Address, City and Country.
            return (
                <FormControl required={required} error={Boolean(error)} disabled={locked} fullWidth>
                    <FormLabel sx={{ mb: 1.5 }}>{label}</FormLabel>
                    <Stack spacing={2}>
                        <TextField fullWidth required={required} label="Street Address" value={address.line1 ?? ''} disabled={locked} slotProps={textSlot} error={missing('line1')} onChange={set('line1')} />
                        <TextField fullWidth label="Street Address Line 2" value={address.line2 ?? ''} disabled={locked} slotProps={textSlot} onChange={set('line2')} />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField fullWidth required={required} label="City" value={address.city ?? ''} disabled={locked} slotProps={textSlot} error={missing('city')} onChange={set('city')} />
                            <TextField fullWidth label="County" value={address.state ?? ''} disabled={locked} slotProps={textSlot} onChange={set('state')} />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField fullWidth label="Postal" value={address.postal ?? ''} disabled={locked} slotProps={textSlot} onChange={set('postal')} />
                            <Autocomplete
                                fullWidth
                                options={COUNTRY_OPTIONS}
                                value={country}
                                disabled={locked}
                                readOnly={readOnly}
                                onChange={(event, option) => onChange({ ...address, country: option?.code ?? '' })}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, current) => option.code === current.code}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        required={required}
                                        label="Country"
                                        error={missing('country')}
                                        helperText={missing('country') ? 'Pick a country from the list' : undefined}
                                    />
                                )}
                            />
                        </Stack>
                    </Stack>
                    {error && <FormHelperText>{error}</FormHelperText>}
                </FormControl>
            );
        }

        case 'phone':
            return (
                <FormControl error={Boolean(error)} disabled={locked} fullWidth>
                    <FormLabel sx={{ mb: 1.5 }}>{label}</FormLabel>
                    <PhoneField value={value ?? { country: '', number: '' }} onChange={onChange} disabled={locked} />
                    {error && <FormHelperText>{error}</FormHelperText>}
                </FormControl>
            );

        case 'file': {
            const files = Array.isArray(value) ? value : [];

            // The files themselves aren't kept with the answers.
            if (readOnly) {
                return (
                    <FormControl fullWidth>
                        <FormLabel sx={{ mb: 1 }}>{label}</FormLabel>
                        <Typography variant="body2" color="text.secondary">
                            Uploaded files are in the application's Application Photos column.
                        </Typography>
                    </FormControl>
                );
            }

            return (
                <FormControl error={Boolean(error)} disabled={locked} fullWidth>
                    <FormLabel sx={{ mb: 1 }}>{label}</FormLabel>
                    <Box>
                        <Button component="label" variant="outlined" size="small" startIcon={<UploadIcon />} disabled={locked}>
                            Choose files
                            <input
                                hidden
                                multiple
                                type="file"
                                accept={PHOTO_EXTENSIONS.map((extension) => `.${extension}`).join(',')}
                                onChange={(event) => {
                                    onChange([...files, ...Array.from(event.target.files ?? [])]);
                                    event.target.value = '';
                                }}
                            />
                        </Button>
                    </Box>
                    {files.length > 0 && (
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                            {files.map((file, index) => (
                                <Stack key={`${file.name}-${index}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{file.name}</Typography>
                                    <Button size="small" disabled={locked} onClick={() => onChange(files.filter((_, position) => position !== index))}>
                                        Remove
                                    </Button>
                                </Stack>
                            ))}
                        </Stack>
                    )}
                    {error && <FormHelperText>{error}</FormHelperText>}
                </FormControl>
            );
        }

        default:
            return (
                <TextField
                    fullWidth
                    type={question.type === 'email' ? 'email' : 'text'}
                    required={required}
                    label={label}
                    value={value ?? ''}
                    disabled={locked}
                    error={Boolean(error)}
                    helperText={helper}
                    onChange={(event) => onChange(event.target.value)}
                    slotProps={textSlot}
                />
            );
    }
}

export default PreAdoptionQuestion;
