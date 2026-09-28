import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  TextField,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import { CloseIcon, DeleteIcon, UploadIcon, CheckCircleIcon } from "../../icons";
import { formatBytes } from "../../../utils/formatBytes";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const NOTE_MAX_LENGTH = 500;

let nextRowId = 0;

// Pick several files, give each an optional note (and a document type when
// `documentTypes` is given - then required), and upload them one after
// another (so each lands in the column before the next). Files that fail
// stay in the list with their error.
//   documentTypes: { KEY: { label } } or omitted
//   upload(file, { documentType, note }) -> answers what onUploaded receives
//   accept: the file input's accept filter (e.g. "image/*,video/*")
function UploadFilesDialog({ open, title, documentTypes, accept, upload, onClose, onUploaded }) {
  const typeOptions = documentTypes ? Object.entries(documentTypes) : [];
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  function addFiles(event) {
    const selected = Array.from(event.target.files ?? []);

    // Reset so picking the same file again later still fires onChange.
    event.target.value = "";

    const oversized = selected.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    setError(oversized.length ? `Larger than 20MB, not added: ${oversized.map((file) => file.name).join(", ")}` : null);
    setRows((current) => [
      ...current,
      ...selected
        .filter((file) => file.size <= MAX_FILE_SIZE_BYTES)
        .map((file) => ({ id: nextRowId++, file, documentType: "", note: "", status: "pending", error: null })),
    ]);
  }

  function updateRow(id, changes) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  }

  function removeRow(id) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function setTypeForAll(documentType) {
    setRows((current) => current.map((row) => (row.status === "done" ? row : { ...row, documentType })));
  }

  function handleClose() {
    if (uploading) {
      return;
    }

    setRows([]);
    setError(null);
    onClose();
  }

  async function handleUpload() {
    const toUpload = rows.filter((row) => row.status !== "done");

    if (toUpload.length === 0) {
      setError("Add at least one file.");
      return;
    }

    if (documentTypes && toUpload.some((row) => !row.documentType)) {
      setError("Pick a document type for every file.");
      return;
    }

    setUploading(true);
    setError(null);

    let failed = 0;

    for (const row of toUpload) {
      updateRow(row.id, { status: "uploading", error: null });

      try {
        const result = await upload(row.file, { documentType: row.documentType || null, note: row.note.trim() });

        updateRow(row.id, { status: "done" });
        onUploaded(result);
      } catch (err) {
        console.error("Failed to upload file:", err);
        failed += 1;
        updateRow(row.id, { status: "failed", error: err?.message || "Upload failed." });
      }
    }

    setUploading(false);

    if (failed === 0) {
      setRows([]);
      onClose();
    } else {
      setRows((current) => current.filter((row) => row.status !== "done"));
      setError(`${failed} of ${toUpload.length} file(s) failed to upload. Fix or remove them and try again.`);
    }
  }

  const pending = rows.filter((row) => row.status !== "done");

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>
        {title}
        <IconButton onClick={handleClose} disabled={uploading} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" } }}>
            <Button component="label" variant="outlined" startIcon={<UploadIcon fontSize="small" />} disabled={uploading}>
              Choose files
              <input type="file" hidden multiple accept={accept} onChange={addFiles} />
            </Button>

            {documentTypes && pending.length > 1 && (
              <TextField
                select
                size="small"
                label="Set type for all"
                value=""
                onChange={(event) => setTypeForAll(event.target.value)}
                disabled={uploading}
                sx={{ minWidth: 220 }}
              >
                {typeOptions.map(([key, type]) => (
                  <MenuItem key={key} value={key}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Typography variant="body2" color="text.secondary">
              Up to 20MB per file.
            </Typography>
          </Stack>

          {rows.length === 0 && <Typography color="text.secondary">No files chosen yet.</Typography>}

          {rows.map((row) => (
            <Box key={row.id} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 600, flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{row.file.name}</Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                    {formatBytes(row.file.size)}
                  </Typography>

                  {row.status === "uploading" && <CircularProgress size={16} sx={{ color: "text.secondary" }} />}
                  {row.status === "done" && <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />}

                  <IconButton size="small" onClick={() => removeRow(row.id)} disabled={uploading} aria-label={`Remove ${row.file.name}`}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  {documentTypes && (
                    <TextField
                      select
                      size="small"
                      label="Document type"
                      required
                      value={row.documentType}
                      onChange={(event) => updateRow(row.id, { documentType: event.target.value })}
                      disabled={uploading}
                      sx={{ minWidth: 220 }}
                    >
                      {typeOptions.map(([key, type]) => (
                        <MenuItem key={key} value={key}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  <TextField
                    fullWidth
                    size="small"
                    label="Note (optional)"
                    value={row.note}
                    onChange={(event) => updateRow(row.id, { note: event.target.value })}
                    disabled={uploading}
                    slotProps={{ htmlInput: { maxLength: NOTE_MAX_LENGTH } }}
                  />
                </Stack>

                {row.error && (
                  <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
                    {row.error}
                  </Alert>
                )}
              </Stack>
            </Box>
          ))}

          {error && (
            <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button size="small" onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>

        <Button size="small" variant="contained" onClick={handleUpload} disabled={uploading || pending.length === 0}>
          {uploading ? "Uploading..." : pending.length === 1 ? "Upload 1 file" : `Upload ${pending.length} files`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UploadFilesDialog;
