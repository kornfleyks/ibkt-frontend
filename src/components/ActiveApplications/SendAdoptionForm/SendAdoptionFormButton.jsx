import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { CloseIcon, ContentCopyIcon, EmailIcon, OpenInNewIcon } from "../../icons";
import { getAdoptionFormState, recordAdoptionFormSend } from "../../../services/AdoptionFormService";
import { ADOPTION_FORMS, SEND_METHODS, UAE_COUNTRY } from "../../../constants/forms/adoptionForms";
import useAuth from "../../../hooks/useAuth";
import useDateFormat from "../../../hooks/useDateFormat";

// "Email References" in the application header (Active applications):
// the pre-filled link to the UAE or UK/US Adoption Form, picked from the
// applicant's country and changeable. Until the app can send email, the
// volunteer copies the link or opens it in their email app; either one
// records the send. Only for UAE applicants: Jotform's own approval
// workflow sends everyone else the UK/US form ("Request references"), so
// for them the button stays visible but disabled, with the reason on hover.
// Give it key={applicationId} so another application starts fresh.

const NOT_UAE_REASON =
  "Jotform sends the UK/US Adoption Form itself when you click \"Request references\" in its approval. This button is for UAE applicants, who Jotform doesn't send a form to.";

const METHOD_LABELS = {
  [SEND_METHODS.COPY_LINK]: "link copied",
  [SEND_METHODS.EMAIL_CLIENT]: "email app",
};

function firstNameOf(name) {
  const words = (name ?? "").trim().split(/\s+/);

  return words.length > 1 ? words.slice(0, -1).join(" ") : words[0] ?? "";
}

function emailClientLink({ to, applicantName, formName, link, senderName }) {
  const subject = `Your adoption application: ${formName}`;
  const body = [
    `Hi ${firstNameOf(applicantName)},`,
    "",
    `Thank you for your adoption application with Itty Bitty Kitty Tails. The next step is our ${formName}. Please fill it in here:`,
    "",
    link,
    "",
    "Some of your details are already filled in, please check them.",
    "",
    "Kind regards,",
    senderName,
  ].join("\n");

  return `mailto:${encodeURIComponent(to ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function SendAdoptionFormButton({ applicationId, applicationName, applicantEmail, applicantCountry }) {
  const isUae = applicantCountry?.trim() === UAE_COUNTRY;
  const { user } = useAuth();
  const { formatDateTime } = useDateFormat();

  // undefined while loading, null when it failed.
  const [state, setState] = useState(undefined);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Nothing to load while the button is disabled for this applicant.
    if (!isUae) return undefined;

    let cancelled = false;

    getAdoptionFormState(applicationId)
      .then((result) => {
        if (cancelled) return;

        setState(result);
        setFormKey(result.suggested.key);
      })
      .catch((err) => {
        console.error("Failed to load the Adoption Form state:", err);
        if (!cancelled) setState(null);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId, isUae]);

  const lastInvite = state?.invites?.[0];
  const hint = !isUae
    ? NOT_UAE_REASON
    : state === undefined
      ? "Loading..."
      : state === null
        ? "Couldn't load the Adoption Form. Reload the page to try again."
        : !state.canSend
          ? state.blockedReason
          : null;
  const sentNote = lastInvite
    ? `Sent ${formatDateTime(new Date(lastInvite.sentAt))} by ${lastInvite.sentBy?.name ?? "someone"}`
    : "";
  const form = state?.forms.find((candidate) => candidate.key === formKey);

  function closeDialog() {
    if (saving) return;

    setOpen(false);
    setMessage(null);
  }

  async function record(method) {
    setSaving(true);
    setMessage(null);

    try {
      const { invite } = await recordAdoptionFormSend(applicationId, { formKey, method });

      setState((current) => ({ ...current, invites: [invite, ...current.invites] }));

      return true;
    } catch (err) {
      setMessage({ severity: "error", text: err.message || "Couldn't record the send." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(form.link);
    } catch {
      setMessage({ severity: "error", text: "Couldn't copy the link. Select it and copy it by hand." });
      return;
    }

    if (await record(SEND_METHODS.COPY_LINK)) {
      setMessage({ severity: "success", text: "Link copied. Paste it into your email to the applicant." });
    }
  }

  async function openInEmail() {
    if (!(await record(SEND_METHODS.EMAIL_CLIENT))) return;

    window.location.href = emailClientLink({
      to: applicantEmail,
      applicantName: applicationName,
      formName: form.name,
      link: form.link,
      senderName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
    });
    setMessage({ severity: "success", text: "Your email app should open with the email ready. Check it and send it." });
  }

  return (
    <>
      {/* The span lets the tooltip work on a disabled button. */}
      <Tooltip title={hint ?? sentNote}>
        <span>
          <Button variant="outlined" startIcon={<EmailIcon />} disabled={Boolean(hint)} onClick={() => setOpen(true)}>
            {lastInvite ? "Resend References" : "Email References"}
          </Button>
        </span>
      </Tooltip>

      <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: "1.1rem", pr: 6 }}>
          Email References: {applicationName}
          <IconButton onClick={closeDialog} aria-label="Close" sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {state && form && (
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <div>
                <Typography variant="subtitle2">Form</Typography>
                <RadioGroup value={formKey} onChange={(event) => setFormKey(event.target.value)}>
                  {state.forms.map((candidate) => (
                    <FormControlLabel
                      key={candidate.key}
                      value={candidate.key}
                      control={<Radio />}
                      disabled={saving}
                      label={candidate.key === state.suggested.key ? `${candidate.name} (suggested)` : candidate.name}
                    />
                  ))}
                </RadioGroup>
                <Typography variant="body2" color="text.secondary">
                  {state.suggested.reason}
                </Typography>
              </div>

              {formKey !== state.suggested.key && (
                <Alert severity="warning">
                  You picked a different form from the one suggested for this applicant&apos;s country.
                </Alert>
              )}

              <TextField
                label="Pre-filled link"
                value={form.link}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Open the form to check it">
                          <IconButton edge="end" href={form.link} target="_blank" rel="noopener noreferrer" aria-label="Open the form">
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Alert severity="info">
                The app can&apos;t send email yet. Copy the link into your own email, or open it in your email app with the
                email ready. Either one records that the form was sent to {applicantEmail || "the applicant"}.
              </Alert>

              {message && <Alert severity={message.severity}>{message.text}</Alert>}

              {state.invites.length > 0 && (
                <div>
                  <Typography variant="subtitle2">Sent before</Typography>
                  {state.invites.map((invite) => (
                    <Typography key={invite.id} variant="body2" color="text.secondary">
                      {formatDateTime(new Date(invite.sentAt))}: {ADOPTION_FORMS[invite.formKey]?.name ?? invite.formId} by{" "}
                      {invite.sentBy?.name ?? "someone"} ({METHOD_LABELS[invite.method] ?? invite.method})
                    </Typography>
                  ))}
                </div>
              )}
            </Stack>
          </DialogContent>
        )}

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Close
          </Button>
          <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyLink} disabled={saving || !form}>
            Copy link
          </Button>
          <Button variant="contained" startIcon={<EmailIcon />} onClick={openInEmail} disabled={saving || !form || !applicantEmail}>
            Open in email
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SendAdoptionFormButton;
