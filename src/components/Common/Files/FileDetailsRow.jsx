import { Stack, Box, Button, Chip, IconButton, Typography } from "@mui/material";
import { DeleteIcon, OpenInNewIcon } from "../../icons";
import { formatBytes } from "../../../utils/formatBytes";
import useDateFormat from "../../../hooks/useDateFormat";

// One file with what's known about it (server/itemFiles.js): name (opens
// the file), optional type chip, file type, size, who uploaded it and when,
// and the note. `typeLabel`: the chip's text, or nothing for no chip.
function FileDetailsRow({ file, typeLabel, onDelete }) {
  const { formatDateTime } = useDateFormat();
  const uploader = file.uploadedBy ? `${file.uploadedBy.name}${file.uploadedBy.role ? ` (${file.uploadedBy.role})` : ""}` : "Unknown";
  const details = [
    file.extension?.toUpperCase(),
    file.sizeBytes !== null && file.sizeBytes !== undefined ? formatBytes(file.sizeBytes) : null,
    `Uploaded by ${uploader}`,
    file.uploadedAt ? formatDateTime(new Date(file.uploadedAt)) : null,
  ].filter(Boolean);

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
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 0.5 }}>
            <Button
              size="small"
              endIcon={<OpenInNewIcon fontSize="small" />}
              onClick={() => window.open(file.url, "_blank", "noopener")}
              disabled={!file.url}
              sx={{ textTransform: "none", fontWeight: 600, p: 0, minWidth: 0, textAlign: "left", overflowWrap: "anywhere" }}
            >
              {file.name}
            </Button>

            {typeLabel && <Chip label={typeLabel} size="small" variant={file.documentType ? "filled" : "outlined"} />}
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {details.join(" · ")}
          </Typography>

          {file.note && (
            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic", overflowWrap: "anywhere" }}>
              {file.note}
            </Typography>
          )}
        </Box>

        <IconButton
          size="small"
          aria-label={`Delete ${file.name}`}
          onClick={() => onDelete(file)}
          className="row-delete-button"
          sx={{ opacity: 0, transition: "opacity 0.15s" }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

export default FileDetailsRow;
