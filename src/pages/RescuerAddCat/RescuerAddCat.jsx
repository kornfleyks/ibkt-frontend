import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, IconButton, Stack, Tab, Tabs } from '@mui/material';

import PageHeader from '../../components/PageHeader';
import { AddIcon, CloseIcon } from '../../components/icons';
import CatFormFields from '../../components/CatForm/CatFormFields';
import { EMPTY_CAT_FILES, EMPTY_CAT_FORM } from '../../components/CatForm/catFormDefaults';
import { addPortalCat, addPortalCatGroup, getPortalOptions, uploadPortalFile } from '../../services/RescuerPortalService';

function emptyEntry() {
    return { form: EMPTY_CAT_FORM, files: EMPTY_CAT_FILES, fileErrors: {} };
}

// "Misty", "Misty and Smoke", "Misty, Smoke and Ash".
function joinNames(names) {
    return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
}

// The portal's Add Cat page: creates the cat (Intake, theirs), then uploads
// the chosen files one by one. Like the staff Add Cat form, "Add Another Cat"
// adds more cats at once: they are created together and linked as a bonded
// group, up to the Max Bonded Cats setting. A cat exists once the first step
// succeeds, so a failed file is reported without undoing the cat.
function RescuerAddCat() {
    const navigate = useNavigate();
    const [entries, setEntries] = useState([emptyEntry()]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [options, setOptions] = useState({ breed: [], colour: [] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Until the setting is known, only one cat can be added.
    const maxCats = options.maxBondedCats ?? 1;

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

    // Changes one part (form, files or fileErrors) of one cat. `update` is the
    // new value, or a function of the current one (the shared form fields call
    // it that way).
    function setPart(index, part, update) {
        setEntries((current) => current.map((entry, i) => (i === index ? { ...entry, [part]: typeof update === 'function' ? update(entry[part]) : update } : entry)));
    }

    function addAnotherCat() {
        setEntries((current) => [...current, emptyEntry()]);
        setActiveIndex(entries.length);
    }

    function removeCat(index) {
        setEntries((current) => current.filter((_, i) => i !== index));
        setActiveIndex((current) => Math.max(0, current >= index ? current - 1 : current));
    }

    async function handleSubmit() {
        const missingName = entries.findIndex((entry) => !entry.form.name?.trim());

        if (missingName !== -1) {
            setActiveIndex(missingName);
            setError(entries.length > 1 ? `Cat ${missingName + 1} needs a name.` : 'The cat needs a name.');
            return;
        }

        const fileProblemIndex = entries.findIndex((entry) => Object.values(entry.fileErrors).some(Boolean));

        if (fileProblemIndex !== -1) {
            setActiveIndex(fileProblemIndex);
            setError('Fix the file problems first.');
            return;
        }

        setSaving(true);
        setError(null);

        let cats;

        try {
            cats = entries.length === 1 ? [await addPortalCat(entries[0].form)] : (await addPortalCatGroup(entries.map((entry) => entry.form))).cats;
        } catch (err) {
            console.error('Failed to add the cat:', err);
            setError(err.message || 'Failed to add the cat.');
            setSaving(false);
            return;
        }

        // One at a time: Monday rate-limits bursts.
        const failed = [];

        for (const [index, cat] of cats.entries()) {
            for (const [kind, list] of Object.entries(entries[index].files)) {
                for (const file of list) {
                    try {
                        await uploadPortalFile(cat.id, kind, file);
                    } catch (err) {
                        console.error(`Failed to upload ${file.name}:`, err);
                        failed.push(cats.length > 1 ? `${file.name} (${cat.name})` : file.name);
                    }
                }
            }
        }

        const names = cats.map((cat) => cat.name);

        navigate('/rescuer', {
            state: {
                notice: failed.length
                    ? `${joinNames(names)} ${names.length > 1 ? 'were' : 'was'} added, but these files did not upload: ${failed.join(', ')}. Contact IBKT to add them.`
                    : names.length > 1
                      ? `${joinNames(names)} were added as a bonded group.`
                      : `${names[0]} was added.`,
            },
        });
    }

    return (
        <>
            <PageHeader title="Add Cat" subtitle="Tell us about a cat you want to rehome. IBKT will review it." />

            <Stack spacing={2}>
                {entries.length > 1 && (
                    <Alert severity="info">
                        Adding {entries.length} cats as a bonded group. Each cat needs its own details, and they will be linked together as bonded once they are added.
                    </Alert>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tabs value={activeIndex} onChange={(event, value) => setActiveIndex(value)} variant="scrollable" scrollButtons="auto" sx={{ flex: 1, minHeight: 0 }}>
                        {entries.map((entry, index) => (
                            <Tab
                                key={index}
                                sx={{ minHeight: 0 }}
                                label={
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <span>{entry.form.name || `Cat ${index + 1}`}</span>
                                        {entries.length > 1 && (
                                            <IconButton
                                                size="small"
                                                component="span"
                                                aria-label={`Remove Cat ${index + 1}`}
                                                disabled={saving}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    removeCat(index);
                                                }}
                                            >
                                                <CloseIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        )}
                                    </Stack>
                                }
                            />
                        ))}
                    </Tabs>

                    <Button size="small" startIcon={<AddIcon />} onClick={addAnotherCat} disabled={saving || entries.length >= maxCats}>
                        Add Another Cat
                    </Button>
                </Box>

                {options.maxBondedCats != null && entries.length >= maxCats && entries.length > 1 && (
                    <Alert severity="info">A bonded group can have at most {maxCats} cats.</Alert>
                )}

                {entries.map((entry, index) => (
                    <Box key={index} sx={{ display: index === activeIndex ? 'block' : 'none' }}>
                        <Stack spacing={2}>
                            <CatFormFields
                                form={entry.form}
                                onFieldChange={(key, value) => setPart(index, 'form', (current) => ({ ...current, [key]: value }))}
                                files={entry.files}
                                onFilesChange={(update) => setPart(index, 'files', update)}
                                fileErrors={entry.fileErrors}
                                onFileErrorsChange={(update) => setPart(index, 'fileErrors', update)}
                                options={options}
                                disabled={saving}
                            />
                        </Stack>
                    </Box>
                ))}

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button component={RouterLink} to="/rescuer" disabled={saving}>
                        Cancel
                    </Button>

                    <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Adding...' : entries.length > 1 ? `Add ${entries.length} Cats` : 'Add Cat'}
                    </Button>
                </Stack>
            </Stack>
        </>
    );
}

export default RescuerAddCat;
