import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ContentCopyIcon, OpenInNewIcon } from '../../components/icons';
import PageHeader from '../../components/PageHeader';
import { FORM_LINKS } from '../../constants/forms/formLinks';

// The link people open: this app's own address plus the form's page (the
// app can sit under a sub-path, e.g. on GitHub Pages).
function fullLink(path) {
    return `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

function Forms() {
    const [message, setMessage] = useState(null);

    async function copy(form) {
        try {
            await navigator.clipboard.writeText(fullLink(form.path));
            setMessage({ severity: 'success', text: `${form.title} link copied.` });
        } catch {
            setMessage({ severity: 'error', text: "Couldn't copy the link. Select it and copy it by hand." });
        }
    }

    return (
        <>
            <PageHeader title="Forms" subtitle="Links to the forms you can send to people." />

            {message && (
                <Alert severity={message.severity} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            <Stack spacing={2}>
                {FORM_LINKS.map((form) => (
                    <Card key={form.key}>
                        <CardContent>
                            <Typography variant="h6" component="h2">
                                {form.title}
                            </Typography>

                            <Typography color="text.secondary" sx={{ mb: 1 }}>
                                {form.description}
                            </Typography>

                            <Typography variant="body2" sx={{ mb: 2, wordBreak: 'break-all' }}>
                                {fullLink(form.path)}
                            </Typography>

                            <Stack direction="row" spacing={1}>
                                <Button size="small" variant="contained" startIcon={<ContentCopyIcon />} onClick={() => copy(form)}>
                                    Copy link
                                </Button>

                                <Button
                                    size="small"
                                    startIcon={<OpenInNewIcon />}
                                    component="a"
                                    href={fullLink(form.path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                ))}
            </Stack>
        </>
    );
}

export default Forms;
