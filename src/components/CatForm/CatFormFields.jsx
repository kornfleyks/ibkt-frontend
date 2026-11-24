import { Autocomplete, Button, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';

import SectionCard from '../Common/SectionCard';
import { PORTAL_FILE_RULES, fileProblem } from '../../constants/rescuerPortal';
import { CATS_STATUS_OPTIONS } from '../../constants/statuses/catsStatuses';

const S = CATS_STATUS_OPTIONS;
const YES_NO = [S.INDOOR_ONLY.YES, S.INDOOR_ONLY.NO];
const YES_NO_SOMETIMES = [S.LAP_CAT.YES, S.LAP_CAT.NO, S.LAP_CAT.SOMETIMES, S.LAP_CAT.UNKNOWN];
const YES_NO_PLANNED = [S.VACCINATED.YES, S.VACCINATED.NO, S.VACCINATED.PLANNED];

// What the Add Cat forms ask (the rescuer portal's page and the shareable
// link's page): the server accepts only these, and always makes the cat
// Intake. type: text | longText | number | select | list
const WHERE_SECTION = 'Where the cat is now';

const SECTIONS = [
    {
        title: 'About the cat',
        fields: [
            { key: 'name', label: 'Name', type: 'text', required: true },
            { key: 'gender', label: 'Gender', type: 'select', options: Object.values(S.GENDER) },
            { key: 'age', label: 'Age (years)', type: 'number' },
            { key: 'breed', label: 'Breed', type: 'list', optionsKey: 'breed' },
            { key: 'colour', label: 'Colour', type: 'list', optionsKey: 'colour' },
        ],
    },
    {
        title: 'Personality',
        fields: [
            { key: 'personalitySummary', label: 'Personality', type: 'longText', wide: true },
            { key: 'energyLevel', label: 'Energy level', type: 'select', options: Object.values(S.ENERGY_LEVEL) },
            { key: 'lapCat', label: 'Lap cat', type: 'select', options: YES_NO_SOMETIMES },
            { key: 'indoorOnly', label: 'Indoor only', type: 'select', options: YES_NO },
            { key: 'childFriendly', label: 'Child friendly', type: 'select', options: YES_NO_SOMETIMES },
            { key: 'catFriendly', label: 'Cat friendly', type: 'select', options: YES_NO_SOMETIMES },
            { key: 'dogFriendly', label: 'Dog friendly', type: 'select', options: YES_NO_SOMETIMES },
            { key: 'specialNotes', label: 'Special notes', type: 'longText', wide: true },
        ],
    },
    {
        title: 'Health',
        fields: [
            { key: 'medicalSummary', label: 'Medical summary', type: 'longText', wide: true },
            { key: 'vaccinated', label: 'Vaccinated', type: 'select', options: YES_NO_PLANNED },
            { key: 'sterilized', label: 'Neutered / spayed', type: 'select', options: YES_NO_PLANNED },
            { key: 'felvStatus', label: 'FeLV status', type: 'select', options: Object.values(S.FELV_STATUS) },
            { key: 'fivStatus', label: 'FIV status', type: 'select', options: Object.values(S.FIV_STATUS) },
            { key: 'medicationRequired', label: 'Medication required', type: 'select', options: YES_NO },
            { key: 'microchipNumber', label: 'Microchip number', type: 'text' },
        ],
    },
    {
        title: WHERE_SECTION,
        fields: [
            { key: 'fosterContact', label: 'Foster contact', type: 'text' },
            { key: 'fosterLocation', label: 'Foster location', type: 'text' },
        ],
    },
];

function Field({ field, value, onChange, options, disabled }) {
    const size = { xs: 12, md: field.wide ? 12 : 6 };

    return (
        <Grid size={size}>
            {field.type === 'select' ? (
                <TextField select fullWidth size="small" label={field.label} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
                    <MenuItem value="">-</MenuItem>
                    {field.options.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </TextField>
            ) : field.type === 'list' ? (
                <Autocomplete
                    freeSolo
                    size="small"
                    options={options[field.optionsKey] ?? []}
                    inputValue={value ?? ''}
                    disabled={disabled}
                    onInputChange={(event, text) => onChange(text)}
                    renderInput={(params) => <TextField {...params} label={field.label} helperText="Not on the list? Type it in and IBKT will check it." />}
                />
            ) : (
                <TextField
                    fullWidth
                    size="small"
                    required={field.required}
                    type={field.type === 'number' ? 'number' : 'text'}
                    multiline={field.type === 'longText'}
                    minRows={field.type === 'longText' ? 2 : undefined}
                    label={field.label}
                    value={value ?? ''}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
        </Grid>
    );
}

// The fields and file pickers of the Add Cat forms. Controlled: the page
// keeps `form`, `files` and `fileErrors`, checks them and sends them.
// `options` is { breed: [...], colour: [...] }. `omitFields` hides fields by
// key, and `whereExtra` is shown inside "Where the cat is now" (the shared
// link asks who the foster is there).
function CatFormFields({ form, onFieldChange, files, onFilesChange, fileErrors, onFileErrorsChange, options, disabled, omitFields = [], whereExtra = null }) {
    function chooseFiles(kind, fileList) {
        const chosen = Array.from(fileList);
        const rule = PORTAL_FILE_RULES[kind];
        const problem = chosen.map((file) => fileProblem(kind, file)).find(Boolean) ?? (chosen.length > rule.max ? `You can add up to ${rule.max} (${rule.label.toLowerCase()}).` : null);

        onFileErrorsChange((current) => ({ ...current, [kind]: problem ?? undefined }));

        if (!problem) onFilesChange((current) => ({ ...current, [kind]: chosen }));
    }

    return (
        <>
            {SECTIONS.map((section) => (
                <SectionCard key={section.title} title={section.title}>
                    <Grid container spacing={1.5}>
                        {section.fields.filter((field) => !omitFields.includes(field.key)).map((field) => (
                            <Field key={field.key} field={field} value={form[field.key]} options={options} disabled={disabled} onChange={(value) => onFieldChange(field.key, value)} />
                        ))}
                        {whereExtra && section.title === WHERE_SECTION && (
                            <Grid size={12}>{whereExtra}</Grid>
                        )}
                    </Grid>
                </SectionCard>
            ))}

            <SectionCard title="Photos, video and documents">
                <Stack spacing={1.5}>
                    {Object.entries(PORTAL_FILE_RULES).map(([kind, rule]) => (
                        <div key={kind}>
                            <Button component="label" variant="outlined" size="small" disabled={disabled}>
                                {files[kind].length ? `${files[kind].length} file(s) chosen` : `Add ${rule.label.toLowerCase()}`}
                                <input type="file" hidden multiple={rule.max > 1} accept={rule.accept} onChange={(event) => chooseFiles(kind, event.target.files)} />
                            </Button>

                            <Typography variant="caption" color={fileErrors[kind] ? 'error' : 'text.secondary'} sx={{ ml: 1 }}>
                                {fileErrors[kind] ?? `Up to ${rule.max}, ${rule.maxBytes / (1024 * 1024)} MB each`}
                            </Typography>
                        </div>
                    ))}
                </Stack>
            </SectionCard>
        </>
    );
}

export default CatFormFields;
