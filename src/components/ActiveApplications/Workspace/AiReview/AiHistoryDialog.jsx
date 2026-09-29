import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { getAiReview } from "../../../../services/AiReviewService";
import useDateFormat from "../../../../hooks/useDateFormat";
import { kindLabel, fieldLabel, shownValue, RUN_STATUS_TEXT } from "./aiText";

const INPUT_LABELS = {
  name: "Name",
  whyAdopt: "Why adopt",
  adoptionMotivation: "Motivation",
  previousCatExperience: "Previous cat experience",
  householdInformation: "Household",
  existingPets: "Existing pets",
  workSchedule: "Work schedule",
  country: "Country",
  city: "City",
  linkedCatName: "Linked cat",
};

function RunDetails({ applicationId, runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAiReview(applicationId, runId);

        if (!cancelled) setRun(data);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load this run.");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [applicationId, runId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!run) return <CircularProgress size={20} sx={{ color: "text.secondary" }} />;

  const transcripts = run.input?.transcripts ?? [];

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">What the AI suggested</Typography>
      {Object.entries(run.output).map(([key, value]) => (
        <Typography key={key} variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          <strong>{fieldLabel(key)}:</strong> {shownValue(value)}
        </Typography>
      ))}

      <Typography variant="subtitle2" sx={{ pt: 1 }}>
        What it was given
      </Typography>
      {Object.entries(INPUT_LABELS).map(([key, label]) =>
        run.input?.application?.[key] ? (
          <Typography key={key} variant="body2" sx={{ overflowWrap: "anywhere" }}>
            <strong>{label}:</strong> {run.input.application[key]}
          </Typography>
        ) : null,
      )}
      {transcripts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No transcripts.
        </Typography>
      ) : (
        transcripts.map((transcript, index) => (
          <Typography key={index} variant="body2" sx={{ overflowWrap: "anywhere" }}>
            <strong>Transcript {index + 1}:</strong>{" "}
            {transcript.source === "file"
              ? `file "${transcript.name}"`
              : `pasted text, ${transcript.characters.toLocaleString("en-GB")} characters: "${transcript.excerpt}${transcript.characters > transcript.excerpt.length ? "..." : ""}"`}
          </Typography>
        ))
      )}
    </Stack>
  );
}

// Every AI run on the application: which review, who ran it and when, and
// what happened to it; each opens to its output and the input it used.
function AiHistoryDialog({ open, applicationId, runs, onClose }) {
  const { formatDateTime } = useDateFormat();
  const [expanded, setExpanded] = useState(null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>AI history</DialogTitle>

      <DialogContent dividers>
        {runs.length === 0 ? (
          <Typography color="text.secondary">No AI reviews yet.</Typography>
        ) : (
          runs.map((run) => {
            const status = RUN_STATUS_TEXT[run.status] ?? { label: run.status, color: "default" };

            return (
              <Accordion
                key={run.id}
                disableGutters
                expanded={expanded === run.id}
                onChange={(event, isOpen) => setExpanded(isOpen ? run.id : null)}
              >
                <AccordionSummary>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
                    <Typography sx={{ fontWeight: 600 }}>{kindLabel(run.kind)}</Typography>
                    <Chip label={status.label} size="small" color={status.color} />
                    <Typography variant="body2" color="text.secondary">
                      {`${formatDateTime(new Date(run.createdAt))}${run.createdBy ? ` · ${run.createdBy.name}` : ""}`}
                      {run.decidedBy && run.decidedAt ? ` · ${status.label.toLowerCase()} by ${run.decidedBy.name}, ${formatDateTime(new Date(run.decidedAt))}` : ""}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>{expanded === run.id && <RunDetails applicationId={applicationId} runId={run.id} />}</AccordionDetails>
              </Accordion>
            );
          })
        )}
      </DialogContent>

      <DialogActions>
        <Button size="small" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AiHistoryDialog;
