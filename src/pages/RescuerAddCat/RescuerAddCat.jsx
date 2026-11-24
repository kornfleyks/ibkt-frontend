import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';

import PageHeader from '../../components/PageHeader';
import CatFormFields from '../../components/CatForm/CatFormFields';
import { EMPTY_CAT_FILES, EMPTY_CAT_FORM } from '../../components/CatForm/catFormDefaults';
import { addPortalCat, getPortalOptions, uploadPortalFile } from '../../services/RescuerPortalService';

// The portal's Add Cat page: creates the cat (Intake, theirs), then uploads
// the chosen files one by one. The cat exists once the first step
// succeeds, so a failed file is reported without undoing the cat.
function RescuerAddCat() {
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY_CAT_FORM);
    const [files, setFiles] = useState(EMPTY_CAT_FILES);
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
                <CatFormFields
                    form={form}
                    onFieldChange={setField}
                    files={files}
                    onFilesChange={setFiles}
                    fileErrors={fileErrors}
                    onFileErrorsChange={setFileErrors}
                    options={options}
                    disabled={saving}
                />

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
