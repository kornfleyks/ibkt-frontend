import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';

import AuthLayout from '../../layouts/AuthLayout/AuthLayout';
import PreAdoptionQuestion from '../../components/ActiveApplications/AddApplicationDialog/PreAdoptionQuestion';
import { FOSTER_PAGES, fosterAnswersErrors } from '../../constants/forms/fosterApplicationForm';
import { submitFosterApplication } from '../../services/FosterApplicationService';

// Every phone question starts with the same country.
function initialAnswers() {
    return Object.fromEntries(
        FOSTER_PAGES.flatMap((item) => item.questions)
            .filter((question) => question.type === 'phone')
            .map((question) => [question.key, { country: 'GB', number: '' }]),
    );
}

// Only the errors of the questions on `page`.
function pageErrorsOf(page, answers) {
    const all = fosterAnswersErrors(answers);

    return Object.fromEntries(page.questions.filter((question) => all[question.key]).map((question) => [question.key, all[question.key]]));
}

function firstPageWithError(errors) {
    return FOSTER_PAGES.findIndex((page) => page.questions.some((question) => errors[question.key]));
}

// The public page a new foster fills in (docs/foster-onboarding.md). No
// sign-in. The hidden "website" field is the bot trap the server checks.
function BecomeFoster() {
    const [answers, setAnswers] = useState(initialAnswers);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);
    const [website, setWebsite] = useState('');

    const page = FOSTER_PAGES[step];
    const lastStep = step === FOSTER_PAGES.length - 1;

    function setAnswer(key, value) {
        setAnswers((current) => ({ ...current, [key]: value }));
        setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    }

    function goTo(nextStep) {
        setStep(nextStep);
        window.scrollTo({ top: 0 });
    }

    function handleNext() {
        const pageErrors = pageErrorsOf(page, answers);

        setErrors(pageErrors);

        if (Object.keys(pageErrors).length === 0) goTo(step + 1);
    }

    async function handleSubmit() {
        const allErrors = fosterAnswersErrors(answers);

        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors);
            goTo(firstPageWithError(allErrors));
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await submitFosterApplication(answers, website);
            setDone(true);
        } catch (err) {
            if (err.fields) {
                setErrors(err.fields);
                goTo(Math.max(firstPageWithError(err.fields), 0));
            }

            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    if (done) {
        return (
            <AuthLayout title="Application Sent" width={520}>
                <Alert severity="success" sx={{ mb: 3 }}>
                    Thank you. We have received your application and will email you once we have made a decision.
                </Alert>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Become a Foster" width={720}>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
                {FOSTER_PAGES.map((item) => (
                    <Step key={item.title}>
                        <StepLabel>{item.title}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Stack spacing={3}>
                {page.questions.map((question) => (
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

                {/* Bot trap: invisible and unreachable for people, filled in by bots. */}
                <Box aria-hidden sx={{ position: 'absolute', left: '-10000px', height: 0, overflow: 'hidden' }}>
                    <label>
                        Website
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
                    </label>
                </Box>

                {Object.values(errors).some(Boolean) && <Alert severity="error">Please check the highlighted answers.</Alert>}

                {error && <Alert severity="error">{error}</Alert>}

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {step > 0 && (
                        <Button onClick={() => goTo(step - 1)} disabled={saving}>
                            Back
                        </Button>
                    )}

                    {lastStep ? (
                        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Sending...' : 'Submit Application'}
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={handleNext}>
                            Next
                        </Button>
                    )}
                </Stack>

                <Typography textAlign="center" variant="body2">
                    Already a foster?{' '}
                    <Link component={RouterLink} to="/foster/login" sx={{ color: 'info.main' }}>
                        Sign in
                    </Link>
                </Typography>
            </Stack>
        </AuthLayout>
    );
}

export default BecomeFoster;
