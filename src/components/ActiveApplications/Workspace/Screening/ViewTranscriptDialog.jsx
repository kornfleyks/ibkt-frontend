import { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { ContentCopyIcon } from "../../../icons";

// The whole text of a pasted transcript, in a scrollable area, with a button
// to copy it. `transcript` is null while the dialog is closed.
function ViewTranscriptDialog({ transcript, title, onClose }) {
  const [copyState, setCopyState] = useState("idle");

  // The next time the dialog opens, the Copy button starts fresh.
  function close() {
    setCopyState("idle");
    onClose();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(transcript.text);
      setCopyState("copied");
    } catch (err) {
      console.error("Failed to copy the transcript:", err);
      setCopyState("failed");
    }
  }

  return (
    <Dialog open={Boolean(transcript)} onClose={close} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontSize: "1.1rem" }}>{title}</DialogTitle>

      <DialogContent dividers>
        {transcript && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {`${transcript.characters.toLocaleString("en-GB")} characters`}
            </Typography>
            <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{transcript.text}</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {copyState === "failed" && (
          <Typography variant="caption" color="error" sx={{ mr: "auto", pl: 1 }}>
            Could not copy. Select the text and copy it yourself.
          </Typography>
        )}
        <Button size="small" startIcon={<ContentCopyIcon fontSize="small" />} onClick={copy}>
          {copyState === "copied" ? "Copied" : "Copy text"}
        </Button>
        <Button size="small" variant="contained" onClick={close}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ViewTranscriptDialog;
