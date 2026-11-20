import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import PreAdoptionQuestion from '../../components/ActiveApplications/AddApplicationDialog/PreAdoptionQuestion';
import { isVisible } from '../../constants/forms/preAdoptionForm';
import {
    PUBLIC_FORMS,
    publicFormErrors,
    UPLOAD_EXTENSIONS,
    UPLOAD_MAX_BYTES,
    UPLOAD_MAX_FILES_PER_FORM,
    UPLOAD_MAX_FILES_PER_QUESTION,
} from '../../constants/forms/publicForms';
import { submitPublicForm, uploadPublicFormFile } from '../../services/PublicFormsService';

const UAE_FORM_KEY = 'uae-adoption-form';

function initialAnswers(form) {
    const country = form.key === UAE_FORM_KEY ? 'AE' : 'GB';

    return Object.fromEntries(form.questions.filter((question) => question.type === 'phone').map((question) => [question.key, { country, number: '' }]));
}

// The problems with the chosen files of one question (size, type, count) and
// a required one that has none. Files are only checked here: they are
// uploaded when the form is sent.
function fileError(question, files) {
    const chosen = Array.isArray(files) ? files : [];

    if (question.required && chosen.length === 0) return 'Upload at least one file.';
    if (chosen.length > UPLOAD_MAX_FILES_PER_QUESTION) return `Attach at most ${UPLOAD_MAX_FILES_PER_QUESTION} files.`;

    const extensionOf = (file) => file.name.split('.').pop().toLowerCase();
    const tooBig = chosen.find((file) => file.size > UPLOAD_MAX_BYTES);
    const wrongType = chosen.find((file) => !UPLOAD_EXTENSIONS.includes(extensionOf(file)));

    if (tooBig) return `${tooBig.name} is larger than ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB.`;
    if (wrongType) return `${wrongType.name} is not an accepted file type.`;

    return null;
}

// Every problem on the form: the shared rules, then the chosen files.
function allErrors(form, answers) {
    const errors = publicFormErrors(form, answers);
    let totalFiles = 0;

    for (const question of form.questions.filter((item) => item.type === 'file' && isVisible(item, answers))) {
        const message = fileError(question, answers[question.key]);

        totalFiles += (answers[question.key] ?? []).length;

        if (message) errors[question.key] = message;
    }

    if (totalFiles > UPLOAD_MAX_FILES_PER_FORM) errors.files = `Attach at most ${UPLOAD_MAX_FILES_PER_FORM} files in total.`;

    return errors;
}

// Only the errors of the questions on `page` (the total-files error shows on any page).
function pageErrorsOf(page, errors) {
    return Object.fromEntries(Object.entries(errors).filter(([key]) => key === 'files' || page.questions.some((question) => question.key === key)));
}

function firstPageWithError(form, errors) {
    return form.pages.findIndex((page) => page.questions.some((question) => errors[question.key]));
}

// A public copy of one of the client's Jotform forms
// (constants/forms/publicForms.js, docs/public-forms.md), at /forms/<key>. No
// sign-in. The hidden "website" field is the bot trap the server checks.
// ?applicationId= (from "Send Adoption Form") ties the answers to that
// application.
function PublicForm() {
    const { formKey } = useParams();
    const [searchParams] = useSearchParams();
    const form = PUBLIC_FORMS[formKey];

    const [answers, setAnswers] = useState(() => (form ? initialAnswers(form) : {}));
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);
    const [website, setWebsite] = useState('');
    // File -> its upload token, so a retry after a failed send does not upload again.
    const uploaded = useRef(new Map());

    if (!form) {
        return (
            <AuthLayout title="Form not found" width={520}>
                <Alert severity="warning">This form does not exist. Please check the link you were sent.</Alert>
            </AuthLayout>
        );
    }

    const page = form.pages[step];
    const lastStep = step === form.pages.length - 1;
    const applicationId = searchParams.get('applicationId');

    function setAnswer(key, value) {
        setAnswers((current) => ({ ...current, [key]: value }));
        setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    }

    function goTo(nextStep) {
        setStep(nextStep);
        window.scrollTo({ top: 0 });
    }

    function handleNext() {
        const pageErrors = pageErrorsOf(page, allErrors(form, answers));

        setErrors(pageErrors);

        if (Object.keys(pageErrors).length === 0) goTo(step + 1);
    }

    // The answers with each chosen File replaced by its upload token.
    async function withUploads() {
        const sent = { ...answers };

        for (const question of form.questions.filter((item) => item.type === 'file' && isVisible(item, answers))) {
            sent[question.key] = [];

            for (const file of answers[question.key] ?? []) {
                if (!uploaded.current.has(file)) uploaded.current.set(file, await uploadPublicFormFile(file));

                sent[question.key].push(uploaded.current.get(file));
            }
        }

        return sent;
    }

    async function handleSubmit() {
        const found = allErrors(form, answers);

        if (Object.keys(found).length > 0) {
            setErrors(found);
            goTo(Math.max(firstPageWithError(form, found), 0));
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await submitPublicForm(form.key, await withUploads(), { applicationId, website });
            setDone(true);
        } catch (err) {
            if (err.fields) {
                setErrors(err.fields);
                goTo(Math.max(firstPageWithError(form, err.fields), 0));
            }

            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    if (done) {
        return (
            <AuthLayout title="Thank You" width={520}>
                <Alert severity="success">{form.successMessage}</Alert>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={form.heading} width={760}>
            {form.intro && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {form.intro}
                </Typography>
            )}

            {form.pages.length > 1 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Step {step + 1} of {form.pages.length}: {page.title}
                    </Typography>
                    <LinearProgress variant="determinate" value={((step + 1) / form.pages.length) * 100} />
                </Box>
            )}

            <Stack spacing={3}>
                {page.questions
                    .filter((question) => isVisible(question, answers))
                    .map((question) => (
                        <div key={question.key} id={`public-form-${question.key}`}>
                            <PreAdoptionQuestion
                                question={question}
                                value={question.type === 'agreement' ? question.paragraphs(answers) : answers[question.key]}
                                onChange={(value) => setAnswer(question.key, value)}
                                error={errors[question.key]}
                                disabled={saving}
                                extensions={UPLOAD_EXTENSIONS}
                            />
                        </div>
                    ))}

                {/* Bot trap: invisible and unreachable for people, filled in by bots. */}
                <Box aria-hidden sx={{ position: 'absolute', left: '-10000px', height: 0, overflow: 'hidden' }}>
                    <label>
                        Website
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                    </label>
                </Box>

                {Object.values(errors).some(Boolean) && <Alert severity="error">{errors.files || 'Please check the highlighted answers.'}</Alert>}

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {step > 0 && (
                        <Button onClick={() => goTo(step - 1)} disabled={saving}>
                            Back
                        </Button>
                    )}

                    {lastStep ? (
                        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Sending...' : form.submitLabel}
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={handleNext}>
                            Next
                        </Button>
                    )}
                </Stack>
            </Stack>
        </AuthLayout>
    );
}

export default PublicForm;
