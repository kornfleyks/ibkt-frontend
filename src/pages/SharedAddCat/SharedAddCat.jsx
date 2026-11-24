import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, CircularProgress, Stack } from '@mui/material';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import CatFormFields from '../../components/CatForm/CatFormFields';
import FosterIdentity from '../../components/CatForm/FosterIdentity';
import { EMPTY_CAT_FILES, EMPTY_CAT_FORM } from '../../components/CatForm/catFormDefaults';
import { getCatShareLink, submitSharedCat, uploadSharedFile } from '../../services/CatShareLinkService';

// The first thing missing about the foster, or null. A foster we found
// needs only the email; anyone else also needs name, surname and phone.
function fosterProblem(foster, lookup) {
    if (!foster.email.trim()) return "Enter the foster's email and press Check.";
    if (!lookup) return "Press Check to look up the foster's email.";
    if (lookup.found && !lookup.eligible) return "This foster's record isn't active. Please contact IBKT.";

    if (!lookup.found && (!foster.firstName.trim() || !foster.lastName.trim() || !foster.phone.country || !foster.phone.number.trim())) {
        return "Enter the foster's first name, surname and phone number.";
    }

    return null;
}

// What the server needs: just the email for a foster we found, the full
// details otherwise.
function fosterPayload(foster, lookup) {
    return lookup.found ? { email: foster.email.trim() } : { ...foster, email: foster.email.trim() };
}

// The public Add Cat page opened from a shareable link (/add-cat/:code),
// no sign-in. The link works for one cat: submitting uses it up, then the
// chosen files are uploaded with the same code (the server allows that for
// an hour, for that cat only).
function SharedAddCat() {
    const { code } = useParams();
    const [form, setForm] = useState(EMPTY_CAT_FORM);
    const [files, setFiles] = useState(EMPTY_CAT_FILES);
    const [fileErrors, setFileErrors] = useState({});
    const [options, setOptions] = useState({ breed: [], colour: [] });
    // 'loading' | 'open' | 'gone' | 'done'
    const [state, setState] = useState('loading');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    // 'foster' | 'rescuer': what the link was made for.
    const [audience, setAudience] = useState('rescuer');
    const [foster, setFoster] = useState({ email: '', firstName: '', lastName: '', phone: { country: 'GB', number: '' } });
    const [fosterLookup, setFosterLookup] = useState(undefined);

    useEffect(() => {
        let cancelled = false;

        getCatShareLink(code)
            .then((data) => {
                if (cancelled) return;

                setOptions({ breed: data.breed, colour: data.colour });
                setAudience(data.audience);
                setState('open');
            })
            .catch((err) => {
                console.error('Failed to open the shared link:', err);

                if (cancelled) return;

                setError(err.message);
                setState('gone');
            });

        return () => {
            cancelled = true;
        };
    }, [code]);

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

        if (audience === 'foster') {
            const problem = fosterProblem(foster, fosterLookup);

            if (problem) {
                setError(problem);
                return;
            }
        }

        setSaving(true);
        setError(null);

        let cat;

        try {
            cat = await submitSharedCat(code, audience === 'foster' ? { ...form, foster: fosterPayload(foster, fosterLookup) } : form);
        } catch (err) {
            console.error('Failed to add the cat:', err);

            if (err.status === 404) {
                setError(err.message);
                setState('gone');
            } else {
                setError(err.message || 'Failed to add the cat.');
            }

            setSaving(false);
            return;
        }

        // One at a time: Monday rate-limits bursts.
        const failed = [];

        for (const [kind, list] of Object.entries(files)) {
            for (const file of list) {
                try {
                    await uploadSharedFile(code, kind, file);
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err);
                    failed.push(file.name);
                }
            }
        }

        setResult({ name: cat.name, failed });
        setState('done');
        setSaving(false);
    }

    if (state === 'loading') {
        return (
            <AuthLayout title="Add a Cat" width={520}>
                <Stack sx={{ alignItems: 'center', py: 3 }}>
                    <CircularProgress size={28} />
                </Stack>
            </AuthLayout>
        );
    }

    if (state === 'gone') {
        return (
            <AuthLayout title="Add a Cat" width={520}>
                <Alert severity="warning">{error || 'This link has expired or has already been used. Ask for a new one.'}</Alert>
            </AuthLayout>
        );
    }

    if (state === 'done') {
        return (
            <AuthLayout title="Cat Added" width={520}>
                <Alert severity="success">Thank you. {result.name} was added and IBKT will review it.</Alert>

                {result.failed.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        These files did not upload: {result.failed.join(', ')}. Please tell IBKT so they can be added.
                    </Alert>
                )}
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Add a Cat" width={860}>
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
                    omitFields={audience === 'foster' ? ['fosterContact'] : []}
                    whereExtra={
                        audience === 'foster' ? (
                            <FosterIdentity code={code} value={foster} onChange={setFoster} lookup={fosterLookup} onLookupChange={setFosterLookup} disabled={saving} />
                        ) : null
                    }
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Adding...' : 'Add Cat'}
                    </Button>
                </Stack>
            </Stack>
        </AuthLayout>
    );
}

export default SharedAddCat;
