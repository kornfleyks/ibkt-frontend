import { useState } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { DeleteIcon } from "../../../icons";
import ViewTranscriptDialog from "./ViewTranscriptDialog";
import useDateFormat from "../../../../hooks/useDateFormat";

const PREVIEW_LENGTH = 280;

// A pasted transcript: who added it and when, its length, a preview, and
// delete. Clicking the transcript opens the whole text in a dialog.
function PastedTranscriptRow({ transcript, call, onDelete }) {
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState(false);
  const long = transcript.text.length > PREVIEW_LENGTH;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
        "&:hover .row-delete-button, &:focus-within .row-delete-button": { opacity: 1 },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <Box
          role="button"
          tabIndex={0}
          aria-label="Open the whole transcript"
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          sx={{ flex: 1, minWidth: 0, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
        >
          <Typography sx={{ fontWeight: 600 }}>Pasted transcript</Typography>
          <Typography variant="body2" color="text.secondary">
            {[
              `${transcript.characters.toLocaleString("en-GB")} characters`,
              `Added by ${transcript.createdBy ? `${transcript.createdBy.name}${transcript.createdBy.role ? ` (${transcript.createdBy.role})` : ""}` : "Unknown"}`,
              formatDateTime(new Date(transcript.createdAt)),
            ].join(" · ")}
          </Typography>

          <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {long ? `${transcript.text.slice(0, PREVIEW_LENGTH)}...` : transcript.text}
          </Typography>

          <Typography variant="caption" color="primary" sx={{ display: "block", mt: 0.5 }}>
            Click to read the whole transcript
          </Typography>
        </Box>

        <IconButton
          size="small"
          aria-label="Delete pasted transcript"
          onClick={() => onDelete(transcript)}
          className="row-delete-button"
          sx={{ opacity: 0, transition: "opacity 0.15s" }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>

      <ViewTranscriptDialog transcript={open ? transcript : null} title={`Call ${call} transcript`} onClose={() => setOpen(false)} />
    </Box>
  );
}

export default PastedTranscriptRow;
