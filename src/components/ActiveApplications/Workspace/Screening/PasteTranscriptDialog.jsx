import { useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";

const MAX_LENGTH = 300_000;

// Paste a call transcript as text (kept in the app's database, not on
// Monday). `onSave(text)` saves it and throws on failure.
function PasteTranscriptDialog({ open, call, onSave, onClose }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function close() {
    if (saving) return;

    setText("");
    setError(null);
    onClose();
  }

  async function save() {
    if (!text.trim()) {
      setError("Paste the transcript text first.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(text);
      setText("");
      onClose();
    } catch (err) {
      setError(err?.message || "Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>Paste the Call {call} transcript</DialogTitle>

      <DialogContent dividers>
        <TextField
          fullWidth
          multiline
          minRows={12}
          maxRows={24}
          placeholder="Paste the transcript here"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={saving}
          slotProps={{ htmlInput: { maxLength: MAX_LENGTH } }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {`${text.length.toLocaleString("en-GB")} characters. Kept in the app's database only (not on Monday).`}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button size="small" onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button size="small" variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Save transcript"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PasteTranscriptDialog;
