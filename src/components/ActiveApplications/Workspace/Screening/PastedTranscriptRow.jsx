import { useState } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { DeleteIcon } from "../../../icons";
import useDateFormat from "../../../../hooks/useDateFormat";

const PREVIEW_LENGTH = 280;

// A pasted transcript: who added it and when, its length, a preview that
// opens to the full text, and delete.
function PastedTranscriptRow({ transcript, onDelete }) {
  const { formatDateTime } = useDateFormat();
  const [expanded, setExpanded] = useState(false);
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600 }}>Pasted transcript</Typography>
          <Typography variant="body2" color="text.secondary">
            {[
              `${transcript.characters.toLocaleString("en-GB")} characters`,
              `Added by ${transcript.createdBy ? `${transcript.createdBy.name}${transcript.createdBy.role ? ` (${transcript.createdBy.role})` : ""}` : "Unknown"}`,
              formatDateTime(new Date(transcript.createdAt)),
            ].join(" · ")}
          </Typography>

          <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {expanded || !long ? transcript.text : `${transcript.text.slice(0, PREVIEW_LENGTH)}...`}
          </Typography>

          {long && (
            <Button size="small" onClick={() => setExpanded((current) => !current)} sx={{ mt: 0.5, px: 0 }}>
              {expanded ? "Show less" : "Show all"}
            </Button>
          )}
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
    </Box>
  );
}

export default PastedTranscriptRow;
