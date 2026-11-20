import { useState } from "react";
import { Alert, Button, Checkbox, Chip, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import { TESTIMONIAL_STATUS as S, TESTIMONIAL_ACTION as A, TESTIMONIAL_MAX_LENGTH } from "../../../../constants/testimonials";
import { MAX_ATTEMPTS, REMINDER_INTERVAL_DAYS } from "../../../../constants/postAdoptionReminders";
import useDateFormat from "../../../../hooks/useDateFormat";
import { addDays } from "../../../../utils/localDate";

const STATUS_COLORS = {
  [S.NOT_REQUESTED]: "default",
  [S.REQUESTED]: "info",
  [S.RECEIVED]: "success",
  [S.DECLINED]: "default",
  [S.NO_RESPONSE]: "warning",
};

// The testimonial request of the adoption. Staff ask the adopter themselves
// (outside the app) and record it here: Mark as requested, Asked again (up to
// MAX_ATTEMPTS times, with a reminder every REMINDER_INTERVAL_DAYS days), then
// the testimonial text and whether the adopter agreed to its publication, or
// Declined. `onAction(body)` sends one step to the server and throws on
// failure (the tab shows the error).
function TestimonialSection({ testimonial, onAction }) {
  const { formatDateString } = useDateFormat();
  const [busy, setBusy] = useState(false);
  // "receive" while recording a new testimonial, "update" while editing a received one.
  const [form, setForm] = useState(null);
  const status = testimonial?.status ?? S.NOT_REQUESTED;
  const attempts = testimonial?.attempts ?? 0;
  const lastAsked = testimonial?.lastRequestedOn;

  async function run(body, { closeForm = false } = {}) {
    setBusy(true);

    try {
      await onAction(body);

      if (closeForm) setForm(null);
    } catch {
      // The tab shows the error.
    } finally {
      setBusy(false);
    }
  }

  function openForm(action) {
    setForm({ action, text: action === A.UPDATE ? testimonial.text : "", mayPublish: action === A.UPDATE ? testimonial.mayPublish : false });
  }

  const canRequest = [S.NOT_REQUESTED, S.DECLINED, S.NO_RESPONSE].includes(status);
  const canDecline = [S.NOT_REQUESTED, S.REQUESTED, S.NO_RESPONSE].includes(status);

  return (
    <SectionCard title="Testimonial">
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
          <Chip label={status} size="small" color={STATUS_COLORS[status] ?? "default"} variant={status === S.NOT_REQUESTED ? "outlined" : "filled"} />

          {status === S.REQUESTED && (
            <Typography color="text.secondary">
              {`Asked ${attempts} of ${MAX_ATTEMPTS} times, last on ${formatDateString(lastAsked)}. `}
              {attempts < MAX_ATTEMPTS
                ? `The next reminder is on ${formatDateString(addDays(lastAsked, REMINDER_INTERVAL_DAYS))}.`
                : `With no reply by ${formatDateString(addDays(lastAsked, REMINDER_INTERVAL_DAYS))} it is marked No response.`}
            </Typography>
          )}

          {status === S.RECEIVED && <Typography color="text.secondary">{`Received on ${formatDateString(testimonial.receivedOn)}.`}</Typography>}
        </Stack>

        {status === S.NOT_REQUESTED && (
          <Typography color="text.secondary">
            No testimonial has been requested for this adoption. Ask the adopter yourself, then press Mark as requested to be reminded to follow up.
          </Typography>
        )}

        {status === S.NO_RESPONSE && (
          <Alert severity="info">{`The adopter did not reply after ${MAX_ATTEMPTS} requests, so chasing has stopped. You can request again, or record a testimonial if one arrives.`}</Alert>
        )}

        {status === S.RECEIVED && !form && (
          <Stack spacing={1}>
            <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{testimonial.text}</Typography>
            <Chip
              size="small"
              sx={{ alignSelf: "flex-start" }}
              color={testimonial.mayPublish ? "success" : "default"}
              label={testimonial.mayPublish ? "The adopter agreed to publication" : "Not cleared for publication"}
              variant={testimonial.mayPublish ? "filled" : "outlined"}
            />
          </Stack>
        )}

        {form && (
          <Stack spacing={1.5}>
            <TextField
              label="Testimonial"
              multiline
              minRows={4}
              fullWidth
              value={form.text}
              onChange={(event) => setForm({ ...form, text: event.target.value })}
              disabled={busy}
              slotProps={{ htmlInput: { maxLength: TESTIMONIAL_MAX_LENGTH } }}
              helperText={`The adopter's own words, at most ${TESTIMONIAL_MAX_LENGTH} characters.`}
            />
            <FormControlLabel
              control={<Checkbox checked={form.mayPublish} onChange={(event) => setForm({ ...form, mayPublish: event.target.checked })} disabled={busy} />}
              label="The adopter agreed that it may be published"
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" disabled={busy || !form.text.trim()} onClick={() => run({ action: form.action, text: form.text, mayPublish: form.mayPublish }, { closeForm: true })}>
                {busy ? "Saving..." : "Save testimonial"}
              </Button>
              <Button disabled={busy} onClick={() => setForm(null)}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        )}

        {!form && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            {canRequest && (
              <Button variant="contained" size="small" disabled={busy} onClick={() => run({ action: A.REQUEST })}>
                {status === S.NOT_REQUESTED ? "Mark as requested" : "Request again"}
              </Button>
            )}
            {status === S.REQUESTED && attempts < MAX_ATTEMPTS && (
              <Button variant="outlined" size="small" disabled={busy} onClick={() => run({ action: A.CHASE })}>
                Asked again
              </Button>
            )}
            {status !== S.RECEIVED && (
              <Button variant={status === S.REQUESTED ? "contained" : "outlined"} size="small" disabled={busy} onClick={() => openForm(A.RECEIVE)}>
                Record testimonial
              </Button>
            )}
            {canDecline && (
              <Button variant="outlined" size="small" disabled={busy} onClick={() => run({ action: A.DECLINE })}>
                Declined
              </Button>
            )}
            {status === S.RECEIVED && (
              <Button variant="outlined" size="small" disabled={busy} onClick={() => openForm(A.UPDATE)}>
                Edit
              </Button>
            )}
            {status !== S.NOT_REQUESTED && (
              <Button
                size="small"
                color="inherit"
                disabled={busy}
                onClick={() => {
                  if (status === S.RECEIVED && !window.confirm("Reset removes the saved testimonial text. Continue?")) return;

                  run({ action: A.RESET });
                }}
              >
                Reset
              </Button>
            )}
          </Stack>
        )}

        <Typography variant="caption" color="text.secondary">
          {`The app does not contact the adopter. After you mark a request, you are reminded every ${REMINDER_INTERVAL_DAYS} days to ask again. After ${MAX_ATTEMPTS} requests with no reply, chasing stops and the request is marked No response. Reset removes the request and the text.`}
        </Typography>
      </Stack>
    </SectionCard>
  );
}

export default TestimonialSection;
