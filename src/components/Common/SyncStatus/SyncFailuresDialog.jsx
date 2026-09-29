import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { getSyncFailures } from "../../../services/SyncService";
import useDateFormat from "../../../hooks/useDateFormat";

const cell = { verticalAlign: "top", overflowWrap: "anywhere" };

function FailureDetails({ failure }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2">Monday&apos;s answer</Typography>
        <Typography variant="body2" color="error" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
          {failure.error || "No error recorded."}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          What it tried to change
        </Typography>

        {failure.changes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No field changes (e.g. an archive).
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>New value</TableCell>
                  <TableCell>Column</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {failure.changes.map((change, index) => (
                  <TableRow key={`${change.columnId}-${index}`}>
                    <TableCell sx={{ ...cell, fontWeight: 600 }}>{change.field}</TableCell>
                    <TableCell sx={{ ...cell, whiteSpace: "pre-wrap" }}>{change.value}</TableCell>
                    <TableCell sx={{ ...cell, color: "text.secondary" }}>
                      {change.columnId ?? ""}
                      {change.type ? ` (${change.type})` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      <Box>
        <Button size="small" onClick={() => setShowRaw((open) => !open)} sx={{ px: 0 }}>
          {showRaw ? "Hide what was sent" : "Show what was sent to Monday"}
        </Button>
        {showRaw && (
          <Box
            component="pre"
            sx={{ m: 0, p: 1, bgcolor: "action.hover", borderRadius: 1, fontSize: "0.75rem", overflowX: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            {JSON.stringify(Object.fromEntries(failure.changes.map((change) => [change.columnId ?? change.field, change.raw ?? change.value])), null, 2)}
          </Box>
        )}
      </Box>
    </Stack>
  );
}

// Every change the Monday sync gave up on, with which board and item, what
// it tried to change, how many tries, and Monday's answer.
function SyncFailuresDialog({ open, onClose }) {
  const { formatDateTime } = useDateFormat();
  const [failures, setFailures] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    async function load() {
      setFailures(null);
      setError(null);

      try {
        const data = await getSyncFailures();

        if (!cancelled) setFailures(data);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load the failed changes.");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>
        Failed Monday sync changes
        {failures && (
          <Typography variant="body2" color="text.secondary">
            {`${failures.length} change${failures.length === 1 ? "" : "s"} gave up after the maximum tries. They stay in the database; Monday doesn't have them.`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}

        {!failures && !error && (
          <Stack sx={{ alignItems: "center", py: 4 }}>
            <CircularProgress size={28} sx={{ color: "text.secondary" }} />
          </Stack>
        )}

        {failures?.length === 0 && <Typography color="text.secondary">No failed changes.</Typography>}

        {failures?.map((failure) => (
          <Accordion key={failure.id} disableGutters expanded={expanded === failure.id} onChange={(event, isOpen) => setExpanded(isOpen ? failure.id : null)}>
            <AccordionSummary>
              <Stack spacing={0.5} sx={{ width: "100%" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
                  <Typography sx={{ fontWeight: 600 }}>{failure.board}</Typography>
                  <Typography>{failure.itemName || (failure.itemId ? `item ${failure.itemId}` : "no item")}</Typography>
                  <Chip label={failure.actionText} size="small" variant="outlined" />
                  {!failure.onMonday && failure.itemId && <Chip label="Not on Monday yet" size="small" color="warning" variant="outlined" />}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {[
                    failure.changes.map((change) => change.field).join(", ") || "no field changes",
                    `queued ${formatDateTime(new Date(failure.queuedAt))}`,
                    `${failure.attempts} tr${failure.attempts === 1 ? "y" : "ies"}`,
                    failure.itemId ? `item ${failure.itemId}` : null,
                    `#${failure.id}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>{expanded === failure.id && <FailureDetails failure={failure} />}</AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>

      <DialogActions>
        <Button size="small" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SyncFailuresDialog;
