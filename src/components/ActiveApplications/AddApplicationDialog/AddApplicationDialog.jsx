import { useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import { CloseIcon } from '../../icons';
import PreAdoptionQuestion from './PreAdoptionQuestion';
import { createApplication } from '../../../services/ActiveApplicationsService';
import { visibleScrollbarSx } from '../../../utils/scrollbarSx';
import {
    PRE_ADOPTION_PAGES,
    PHOTO_EXTENSIONS,
    PHOTO_MAX_BYTES,
    answersErrors,
    isVisible,
} from '../../../constants/forms/preAdoptionForm';

// Jotform's address and phone start on the United Kingdom.
function initialAnswers() {
    return {
        fullName: { first: '', last: '' },
        address: { line1: '', line2: '', city: '', state: '', postal: '', country: 'GB' },
        phone: { country: 'GB', number: '' },
        photos: [],
    };
}

function photoError(files) {
    for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (!PHOTO_EXTENSIONS.includes(extension)) return `"${file.name}" isn't an allowed file type.`;
        if (file.size > PHOTO_MAX_BYTES) return `"${file.name}" is larger than 10MB.`;
    }

    return null;
}

// Index of the first page with an error in `errors`, or -1.
function firstPageWithError(errors) {
    return PRE_ADOPTION_PAGES.findIndex((page) => page.questions.some((question) => errors[question.key]));
}

// The labels of the questions with an error on `page`, for the summary
// above the buttons (short: the first few words of long labels).
function errorLabels(page, errors) {
    return page.questions
        .filter((question) => errors[question.key])
        .map((question) => (question.label.length > 60 ? `${question.label.slice(0, 57).trim()}...` : question.label.replace(/[:?]+$/, '')));
}

function scrollToQuestion(key) {
    // After React has drawn the step (and its error messages).
    requestAnimationFrame(() => {
        document.getElementById(`pre-adoption-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

// The in-app copy of the client's Jotform Pre-Adoption Form: the same 5
// pages, questions and conditions (docs/add-application-form.md). Creates
// the application in the app only; the person filling it in becomes the
// Case Owner. onCreated(id) after it's saved.
function AddApplicationDialog({ open, onClose, onCreated }) {
    const [answers, setAnswers] = useState(initialAnswers);
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [existingId, setExistingId] = useState(null);
    const [partialWarning, setPartialWarning] = useState(null);
    const contentRef = useRef(null);

    const page = PRE_ADOPTION_PAGES[step];
    const lastStep = step === PRE_ADOPTION_PAGES.length - 1;
    const pageErrorLabels = errorLabels(page, errors);

    function reset() {
        setAnswers(initialAnswers());
        setErrors({});
        setStep(0);
        setError(null);
        setExistingId(null);
        setPartialWarning(null);
    }

    function handleClose() {
        if (saving) return;

        reset();
        onClose();
    }

    function goTo(nextStep) {
        setStep(nextStep);
        contentRef.current?.scrollTo({ top: 0 });
    }

    function setAnswer(key, value) {
        if (key === 'photos') {
            const problem = photoError(value);

            setErrors((current) => ({ ...current, photos: problem ?? undefined }));

            if (problem) return;
        }

        setAnswers((current) => ({ ...current, [key]: value }));
        setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    }

    function handleNext() {
        const pageErrors = answersErrors(answers, page.questions);

        setErrors(pageErrors);

        const firstKey = Object.keys(pageErrors)[0];

        if (firstKey) {
            scrollToQuestion(firstKey);
            return;
        }

        goTo(step + 1);
    }

    async function handleSubmit() {
        const allErrors = answersErrors(answers);

        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors);
            setStep(firstPageWithError(allErrors));
            scrollToQuestion(Object.keys(allErrors)[0]);
            return;
        }

        setSaving(true);
        setError(null);
        setExistingId(null);

        const { photos, ...formAnswers } = answers;

        try {
            const { id, failedPhotos } = await createApplication(formAnswers, photos);

            onCreated?.(id);

            if (failedPhotos.length > 0) {
                // The application exists - only some photos failed. Keep the
                // dialog open so this is actually seen.
                setPartialWarning(`The application was added, but these files failed to upload: ${failedPhotos.join(', ')}.`);
                return;
            }

            reset();
            onClose();
        } catch (err) {
            console.error('Failed to add the application:', err);

            const fieldErrors = err.details?.fields;

            if (fieldErrors) {
                setErrors(fieldErrors);
                goTo(Math.max(firstPageWithError(fieldErrors), 0));
            }

            setExistingId(err.details?.existingId ?? null);
            setError(err.message || 'Something went wrong while saving. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontSize: '1.1rem' }}>
                Add Application
                <IconButton onClick={handleClose} disabled={saving} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* Outside the scrolling content, so the steps stay pinned at the top. */}
            <Box sx={{ px: 3, pt: 1, pb: 2 }}>
                <Stepper activeStep={step} alternativeLabel>
                    {PRE_ADOPTION_PAGES.map((item) => (
                        <Step key={item.title}>
                            <StepLabel>{item.title}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Box>

            {/* Visible scrollbar on every step (hidden app-wide otherwise). */}
            <DialogContent dividers ref={contentRef} sx={{ overflowY: 'auto', ...visibleScrollbarSx }}>
                <Stack spacing={3}>
                    {page.questions.filter((question) => isVisible(question, answers)).map((question) => (
                        <div key={question.key} id={`pre-adoption-${question.key}`}>
                            <PreAdoptionQuestion
                                question={question}
                                value={answers[question.key]}
                                onChange={(value) => setAnswer(question.key, value)}
                                error={errors[question.key]}
                                disabled={saving || Boolean(partialWarning)}
                            />
                        </div>
                    ))}

                    {pageErrorLabels.length > 0 && (
                        <Alert severity="error">
                            Please check: {pageErrorLabels.join(' · ')}
                        </Alert>
                    )}

                    {partialWarning && <Alert severity="warning">{partialWarning}</Alert>}

                    {error && (
                        <Alert severity="error">
                            {error}
                            {existingId && (
                                <>
                                    {' '}
                                    <Link component={RouterLink} to={`/active-applications/${existingId}`}>
                                        Open it
                                    </Link>
                                </>
                            )}
                        </Alert>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions>
                {partialWarning ? (
                    <Button size="small" variant="contained" onClick={() => { reset(); onClose(); }}>
                        Close
                    </Button>
                ) : (
                    <>
                        <Button size="small" onClick={handleClose} disabled={saving}>
                            Cancel
                        </Button>

                        {step > 0 && (
                            <Button size="small" onClick={() => goTo(step - 1)} disabled={saving}>
                                Back
                            </Button>
                        )}

                        {lastStep ? (
                            <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Saving...' : 'Add Application'}
                            </Button>
                        ) : (
                            <Button size="small" variant="contained" onClick={handleNext}>
                                Next
                            </Button>
                        )}
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default AddApplicationDialog;
