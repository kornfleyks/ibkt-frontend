import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Autocomplete, Button, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';

import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/Common/SectionCard';
import { addPortalCat, getPortalOptions, uploadPortalFile } from '../../services/RescuerPortalService';
import { PORTAL_FILE_RULES, fileProblem } from '../../constants/rescuerPortal';
import { CATS_STATUS_OPTIONS } from '../../constants/statuses/catsStatuses';

const S = CATS_STATUS_OPTIONS;
const YES_NO = [S.INDOOR_ONLY.YES, S.INDOOR_ONLY.NO];
const YES_NO_SOMETIMES = [S.LAP_CAT.YES, S.LAP_CAT.NO, S.LAP_CAT.SOMETIMES, S.LAP_CAT.UNKNOWN];
const YES_NO_PLANNED = [S.VACCINATED.YES, S.VACCINATED.NO, S.VACCINATED.PLANNED];

// What a rescuer fills in (the server accepts only these, and always makes
// the cat Intake and theirs). type: text | longText | number | select | list
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
        title: 'Where the cat is now',
        fields: [
            { key: 'fosterContact', label: 'Foster contact', type: 'text' },
            { key: 'fosterLocation', label: 'Foster location', type: 'text' },
        ],
    },
];

const EMPTY_FORM = {
    felvStatus: S.FELV_STATUS.NOT_TESTED_YET,
    fivStatus: S.FIV_STATUS.NOT_TESTED_YET,
};

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

// The portal's Add Cat page: creates the cat (Intake, theirs), then uploads
// the chosen files one by one. The cat exists once the first step
// succeeds, so a failed file is reported without undoing the cat.
function RescuerAddCat() {
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY_FORM);
    const [files, setFiles] = useState({ photos: [], videos: [], medicalDocuments: [] });
    const [fileErrors, setFileErrors] = useState({});
    const [options, setOptions] = useState({ breed: [], colour: [] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        getPortalOptions()
            .then((data) => !cancelled && setOptions(data))
            .catch((err) => {
                console.error('Failed to load the breed and colour lists:', err);

                if (!cancelled) setError("Couldn't load the breed and colour lists. Reload the page to try again.");
            });

        return () => {
            cancelled = true;
        };
    }, []);

    function setField(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function chooseFiles(kind, fileList) {
        const chosen = Array.from(fileList);
        const rule = PORTAL_FILE_RULES[kind];
        const problem = chosen.map((file) => fileProblem(kind, file)).find(Boolean) ?? (chosen.length > rule.max ? `You can add up to ${rule.max} (${rule.label.toLowerCase()}).` : null);

        setFileErrors((current) => ({ ...current, [kind]: problem ?? undefined }));

        if (!problem) setFiles((current) => ({ ...current, [kind]: chosen }));
    }

    async function handleSubmit() {
        if (!form.name?.trim()) {
            setError('The cat needs a name.');
            return;
        }

        if (Object.values(fileErrors).some(Boolean)) {
            setError('Fix the file problems first.');
            return;
        }

        setSaving(true);
        setError(null);

        let cat;

        try {
            cat = await addPortalCat(form);
        } catch (err) {
            console.error('Failed to add the cat:', err);
            setError(err.message || 'Failed to add the cat.');
            setSaving(false);
            return;
        }

        // One at a time: Monday rate-limits bursts.
        const failed = [];

        for (const [kind, list] of Object.entries(files)) {
            for (const file of list) {
                try {
                    await uploadPortalFile(cat.id, kind, file);
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err);
                    failed.push(file.name);
                }
            }
        }

        navigate('/rescuer', {
            state: {
                notice: failed.length
                    ? `${cat.name} was added, but these files did not upload: ${failed.join(', ')}. Contact IBKT to add them.`
                    : `${cat.name} was added.`,
            },
        });
    }

    return (
        <>
            <PageHeader title="Add Cat" subtitle="Tell us about a cat you want to rehome. IBKT will review it." />

            <Stack spacing={2}>
                {SECTIONS.map((section) => (
                    <SectionCard key={section.title} title={section.title}>
                        <Grid container spacing={1.5}>
                            {section.fields.map((field) => (
                                <Field key={field.key} field={field} value={form[field.key]} options={options} disabled={saving} onChange={(value) => setField(field.key, value)} />
                            ))}
                        </Grid>
                    </SectionCard>
                ))}

                <SectionCard title="Photos, video and documents">
                    <Stack spacing={1.5}>
                        {Object.entries(PORTAL_FILE_RULES).map(([kind, rule]) => (
                            <div key={kind}>
                                <Button component="label" variant="outlined" size="small" disabled={saving}>
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

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button component={RouterLink} to="/rescuer" disabled={saving}>
                        Cancel
                    </Button>

                    <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Adding...' : 'Add Cat'}
                    </Button>
                </Stack>
            </Stack>
        </>
    );
}

export default RescuerAddCat;
