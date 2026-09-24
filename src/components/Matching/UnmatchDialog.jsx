import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { unmatchApplication } from "../../services/MatchingService";
import { CATS_STATUS_OPTIONS } from "../../constants/statuses/catsStatuses";

function UnmatchDialog({ application, onClose, onUnmatched }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const catNames = application.linkedCats.map((cat) => cat.name).join(" & ");

  async function handleUnmatch() {
    setSaving(true);
    setError(null);

    try {
      const result = await unmatchApplication(application);
      onUnmatched({ application, failed: result.failed });
    } catch (err) {
      console.error("Failed to unmatch application:", err);
      setError("Something went wrong while removing the match. Nothing was changed - please try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Remove this match?</DialogTitle>

      <DialogContent>
        <DialogContentText>
          {application.name} will be unlinked from {catNames}. The cats go back to "
          {CATS_STATUS_OPTIONS.STATUS.ADOPTION_READY}" and the Match Confidence is cleared.
        </DialogContentText>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>

        <Button variant="contained" color="error" onClick={handleUnmatch} disabled={saving}>
          {saving ? "Removing..." : "Unmatch"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UnmatchDialog;
