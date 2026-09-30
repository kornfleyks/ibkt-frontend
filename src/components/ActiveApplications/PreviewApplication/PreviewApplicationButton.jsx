import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { AssignmentIcon, CloseIcon } from '../../icons';
import PreAdoptionQuestion from '../AddApplicationDialog/PreAdoptionQuestion';
import { getPreAdoptionAnswers } from '../../../services/ActiveApplicationsService';
import { PRE_ADOPTION_PAGES, isVisible } from '../../../constants/forms/preAdoptionForm';
import { visibleScrollbarSx } from '../../../utils/scrollbarSx';
import useDateFormat from '../../../hooks/useDateFormat';

// "Preview" in the application header: the Pre-Adoption Form the
// application was created with (Add Application), answers filled in and
// read-only. Disabled, with the reason on hover, when there are none.
// Give it key={applicationId} so another application starts fresh.

// Every field is disabled; these keep the answers in normal text colour
// (disabled fields are faded by default) so they're easy to read.
const readableDisabledSx = {
    '& .MuiInputBase-input.Mui-disabled': {
        color: 'text.primary',
        WebkitTextFillColor: (theme) => theme.palette.text.primary,
    },
    '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' },
    '& .MuiFormLabel-root.Mui-disabled, & .MuiInputLabel-root.Mui-disabled': { color: 'text.secondary' },
};
function PreviewApplicationButton({ applicationId, applicationName }) {
    // undefined while checking, null when there are none.
    const [saved, setSaved] = useState(undefined);
    const [loadFailed, setLoadFailed] = useState(false);
    const [open, setOpen] = useState(false);
    const { formatDateTime } = useDateFormat();

    useEffect(() => {
        let cancelled = false;

        getPreAdoptionAnswers(applicationId)
            .then((result) => !cancelled && setSaved(result))
            .catch((err) => {
                console.error('Failed to load the Pre-Adoption answers:', err);

                if (!cancelled) {
                    setSaved(null);
                    setLoadFailed(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [applicationId]);

    const hint = saved === undefined
        ? 'Checking for the application form...'
        : loadFailed
            ? "Couldn't load the application form. Reload the page to try again."
            : saved === null
                ? 'No Pre-Adoption answers for this application (it was created before Add Application existed, or outside the app).'
                : null;

    const answers = saved?.answers ?? {};

    return (
        <>
            {/* The span lets the tooltip work on a disabled button. */}
            <Tooltip title={hint ?? ''}>
                <span>
                    <Button variant="outlined" startIcon={<AssignmentIcon />} disabled={Boolean(hint)} onClick={() => setOpen(true)}>
                        Preview
                    </Button>
                </span>
            </Tooltip>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontSize: '1.1rem', pr: 6 }}>
                    Pre-Adoption Form: {applicationName}
                    {saved?.createdAt && (
                        <Typography variant="body2" color="text.secondary">
                            Added in the app on {formatDateTime(new Date(saved.createdAt))}
                        </Typography>
                    )}
                    <IconButton onClick={() => setOpen(false)} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{ overflowY: 'auto', ...visibleScrollbarSx }}>
                    <Stack spacing={4} sx={readableDisabledSx}>
                        {PRE_ADOPTION_PAGES.map((page) => (
                            <Stack key={page.title} spacing={3}>
                                <Typography variant="h6" component="h2">
                                    {page.title}
                                </Typography>

                                {page.questions
                                    .filter((question) => question.type !== 'note' && isVisible(question, answers))
                                    .map((question) => (
                                        <PreAdoptionQuestion key={question.key} question={question} value={answers[question.key]} readOnly />
                                    ))}
                            </Stack>
                        ))}
                    </Stack>
                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default PreviewApplicationButton;
