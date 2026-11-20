import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';

import PageHeader from '../../components/PageHeader';
import PreAdoptionQuestion from '../../components/ActiveApplications/AddApplicationDialog/PreAdoptionQuestion';
import FosterFilesStep from '../../components/FosterPortal';
import { PROFILE_PAGES, profileAnswersErrors } from '../../constants/forms/fosterProfileForm';
import { isVisible } from '../../constants/forms/preAdoptionForm';
import { missingFiles } from '../../constants/fosterPortal';
import { getMyFosterCat, sendFosterProfile } from '../../services/FosterPortalService';

const FILES_STEP_TITLE = 'Photos and videos';

// Only the errors of the questions on `page`.
function pageErrorsOf(page, answers) {
    const all = profileAnswersErrors(answers);

    return Object.fromEntries(page.questions.filter((question) => all[question.key]).map((question) => [question.key, all[question.key]]));
}

function firstPageWithError(errors) {
    return PROFILE_PAGES.findIndex((page) => page.questions.some((question) => errors[question.key]));
}

function countsOf(files) {
    return files.reduce((counts, file) => ({ ...counts, [file.kind]: (counts[file.kind] ?? 0) + 1 }), {});
}

// The Kitty Profile of one foster cat (docs/foster-onboarding.md): the client's
// profile questions, then the photos, videos, passport and vet report. The
// answers are kept on this page until they are sent; each file is sent as soon
// as it is chosen. IBKT reviews the profile before anything reaches the cat.
function FosterProfile() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [files, setFiles] = useState([]);
    const [answers, setAnswers] = useState({});
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const loaded = await getMyFosterCat(id);

                if (!cancelled) {
                    setData(loaded);
                    setFiles(loaded.files);
                }
            } catch (err) {
                console.error('Failed to load the cat:', err);

                if (!cancelled) setError(err.message || 'Failed to load this cat.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const lastQuestionStep = PROFILE_PAGES.length - 1;
    const filesStep = PROFILE_PAGES.length;
    const onFilesStep = step === filesStep;
    const page = PROFILE_PAGES[step];
    const missing = missingFiles(countsOf(files));

    function setAnswer(key, value) {
        setAnswers((current) => ({ ...current, [key]: value }));
        setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    }

    function goTo(next) {
        setStep(next);
        window.scrollTo({ top: 0 });
    }

    function handleNext() {
        const pageErrors = pageErrorsOf(page, answers);

        setErrors(pageErrors);

        if (Object.keys(pageErrors).length === 0) goTo(step + 1);
    }

    async function handleSend() {
        const allErrors = profileAnswersErrors(answers);

        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors);
            goTo(firstPageWithError(allErrors));

            return;
        }

        setSaving(true);
        setError(null);

        try {
            await sendFosterProfile(id, answers);
            navigate('/foster', { state: { notice: `Your profile for ${data.cat.name} was sent. IBKT will review it.` } });
        } catch (err) {
            const fields = err.details?.fields;

            if (fields) {
                setErrors(fields);
                goTo(Math.max(firstPageWithError(fields), 0));
            }

            setError(err.message || 'Something went wrong. Please try again.');
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
                <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
            </Stack>
        );
    }

    if (!data) {
        return (
            <>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error || 'This cat could not be found.'}
                </Alert>
                <Button component={RouterLink} to="/foster">
                    Back to my cats
                </Button>
            </>
        );
    }

    if (data.profile?.status === 'Pending') {
        return (
            <>
                <PageHeader title={`Kitty Profile for ${data.cat.name}`} />
                <Alert severity="info" sx={{ mb: 2 }}>
                    Your profile for {data.cat.name} is waiting for IBKT to review it, so it can't be changed now.
                </Alert>
                <Button component={RouterLink} to="/foster">
                    Back to my cats
                </Button>
            </>
        );
    }

    return (
        <>
            <PageHeader title={`Kitty Profile for ${data.cat.name}`} subtitle="Tell us about the cat so we can find it the right home." />

            <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
                {[...PROFILE_PAGES.map((item) => item.title), FILES_STEP_TITLE].map((title) => (
                    <Step key={title}>
                        <StepLabel>{title}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Stack spacing={3}>
                {data.profile?.status === 'Rejected' && data.profile.rejectReason && <Alert severity="warning">{data.profile.rejectReason}</Alert>}

                {!onFilesStep &&
                    page.questions
                        .filter((question) => isVisible(question, answers))
                        .map((question) => (
                            <div key={question.key} id={`pre-adoption-${question.key}`}>
                                <PreAdoptionQuestion
                                    question={question}
                                    value={answers[question.key]}
                                    onChange={(value) => setAnswer(question.key, value)}
                                    error={errors[question.key]}
                                    disabled={saving}
                                />
                            </div>
                        ))}

                {onFilesStep && (
                    <>
                        <Typography color="text.secondary">
                            Add clear photos and videos that show how {data.cat.name} looks and behaves. Each file is sent as soon as you choose it. You can leave
                            this page and come back: the files stay until you send the profile.
                        </Typography>

                        <FosterFilesStep catId={id} files={files} onFilesChange={setFiles} disabled={saving} />

                        {missing.length > 0 && (
                            <Alert severity="info">
                                Before you can send the profile, add: {missing.map((item) => `${item.label} (${item.have} of ${item.need})`).join(', ')}.
                            </Alert>
                        )}
                    </>
                )}

                {Object.values(errors).some(Boolean) && <Alert severity="error">Please check the highlighted answers.</Alert>}

                {error && <Alert severity="error">{error}</Alert>}

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <Button component={RouterLink} to="/foster" color="inherit" disabled={saving}>
                        Cancel
                    </Button>

                    <Stack direction="row" spacing={1}>
                        {step > 0 && (
                            <Button onClick={() => goTo(step - 1)} disabled={saving}>
                                Back
                            </Button>
                        )}

                        {onFilesStep ? (
                            <Button variant="contained" onClick={handleSend} disabled={saving || missing.length > 0}>
                                {saving ? 'Sending...' : 'Send Profile'}
                            </Button>
                        ) : (
                            <Button variant="contained" onClick={handleNext}>
                                {step === lastQuestionStep ? 'Next: photos and videos' : 'Next'}
                            </Button>
                        )}
                    </Stack>
                </Box>
            </Stack>
        </>
    );
}

export default FosterProfile;
