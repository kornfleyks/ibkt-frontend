import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { AI_REVIEW_KINDS } from "../../../../constants/aiReviews";
import useDateFormat from "../../../../hooks/useDateFormat";
import { kindLabel, fieldLabel, shownValue } from "./aiText";

const cellText = { whiteSpace: "pre-wrap", overflowWrap: "anywhere", verticalAlign: "top" };

// An open AI draft next to the application's current values. Read-only:
// the whole draft is accepted as the AI wrote it, or discarded.
function AiDraftDialog({ open, run, application, mock, busy, error, onAccept, onDiscard, onClose }) {
  const { formatDateTime } = useDateFormat();

  if (!run) return null;

  const fields = AI_REVIEW_KINDS[run.kind]?.fields ?? Object.keys(run.output);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>
        AI draft: {kindLabel(run.kind)}
        <Typography variant="body2" color="text.secondary">
          {`${formatDateTime(new Date(run.createdAt))}${run.createdBy ? ` · run by ${run.createdBy.name}` : ""} · ${run.provider}${run.model ? ` (${run.model})` : ""}`}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {mock && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is sample text from the mock AI, not a real review. No AI service is connected yet.
          </Alert>
        )}

        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "18%" }}>Field</TableCell>
                <TableCell sx={{ width: "41%" }}>Current value</TableCell>
                <TableCell sx={{ width: "41%" }}>AI suggests</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((key) => {
                const current = application[key];
                const suggested = run.output[key];
                const same = String(current ?? "") === String(suggested ?? "");

                return (
                  <TableRow key={key}>
                    <TableCell sx={{ ...cellText, fontWeight: 600 }}>{fieldLabel(key)}</TableCell>
                    <TableCell sx={{ ...cellText, color: "text.secondary" }}>{shownValue(current)}</TableCell>
                    <TableCell sx={{ ...cellText, fontWeight: same ? 400 : 500 }}>{shownValue(suggested)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Accepting saves every suggested value above into the application (logged in Activity). Discarding changes nothing.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button size="small" onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" color="inherit" onClick={onDiscard} disabled={busy}>
          Discard draft
        </Button>
        <Button size="small" variant="contained" onClick={onAccept} disabled={busy}>
          {busy ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Accept draft"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AiDraftDialog;
