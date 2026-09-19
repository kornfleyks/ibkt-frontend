import { useState } from "react";
import {
  Stack,
  Button,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";

import UploadIcon from "@mui/icons-material/UploadOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";

import SectionCard from "../../../Common/SectionCard";
import InfoRow from "../../../Common/InfoRow";
import BooleanStatus from "../../../Common/BooleanStatus";
import {
  uploadCatPassportFile,
  uploadCatMedicalDocument,
  uploadCatPhoto,
  uploadCatVideo,
  deleteCatPassportFile,
  deleteCatMedicalDocument,
  deleteCatPhoto,
  deleteCatVideo,
  getCat,
} from "../../../../services/CatsService";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

function FileList({ files, onDelete }) {
  return (
    <Stack spacing={0.5} sx={{ pl: 1 }}>
      {files.map((file) => (
        <Stack
          key={file.assetId}
          direction="row"
          alignItems="center"
          sx={{
            '&:hover .row-delete-button, &:focus-within .row-delete-button': {
              opacity: 1,
            },
          }}
        >
          <Button
            size="small"
            onClick={() => window.open(file.url, "_blank")}
            sx={{ justifyContent: "flex-start", textTransform: "none", flex: 1 }}
          >
            {file.name}
          </Button>

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
      ))}
    </Stack>
  );
}

function DocumentSection({ cat, onCatUpdate, label, files, uploadFn, deleteFn, showStatus = true }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  async function handleUpload(event) {
    const selected = Array.from(event.target.files ?? []);

    // Reset so picking the same file again later still fires onChange.
    event.target.value = "";

    if (selected.length === 0) {
      return;
    }

    const oversized = selected.find((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (oversized) {
      setError(`"${oversized.name}" is larger than 20MB.`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        selected.map((file) => uploadFn(cat.id, file)),
      );

      onCatUpdate(await getCat(cat.id));

      const failedCount = results.filter((result) => result.status === "rejected").length;

      if (failedCount > 0) {
        setError(`${failedCount} of ${selected.length} file(s) failed to upload.`);
      }
    } catch (err) {
      console.error(`Failed to upload ${label}:`, err);
      setError("Something went wrong while uploading.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      const remainingFiles = files.filter((file) => file.assetId !== deleteTarget.assetId);

      await deleteFn(cat.id, remainingFiles);

      onCatUpdate(await getCat(cat.id));

      setDeleteTarget(null);
    } catch (err) {
      console.error(`Failed to delete ${label} file:`, err);
      setError("Something went wrong while deleting.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <InfoRow
          label={label}
          labelWidth={160}
          value={showStatus ? <BooleanStatus value={files.length > 0} /> : ''}
        />

        <Button
          component="label"
          size="small"
          variant="outlined"
          startIcon={<UploadIcon fontSize="small" />}
          disabled={uploading}
          sx={{
            ml: "8px",
            color: "text.primary",
            borderColor: "divider",
            "&:hover": {
              borderColor: "text.primary",
              backgroundColor: "action.hover",
            },
          }}
        >
          {uploading ? "Uploading..." : "Upload"}
          <input type="file" hidden multiple onChange={handleUpload} />
        </Button>
      </Stack>

      {files.length > 0 && <FileList files={files} onDelete={setDeleteTarget} />}

      {error && (
        <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
          {error}
        </Alert>
      )}

      <Dialog open={Boolean(deleteTarget)} onClose={() => (deleting ? null : setDeleteTarget(null))}>
        <DialogTitle sx={{ fontSize: "1.1rem" }}>Delete file?</DialogTitle>

        <DialogContent>
          {`"${deleteTarget?.name}" will be permanently removed from ${label}. This can't be undone.`}
        </DialogContent>

        <DialogActions>
          <Button size="small" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>

          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function DocumentsTab({ cat, onCatUpdate }) {
  return (
    <SectionCard title="Documents">
      <Stack spacing={3}>
        <DocumentSection
          cat={cat}
          onCatUpdate={onCatUpdate}
          label="Passport"
          files={cat.passportFile}
          uploadFn={uploadCatPassportFile}
          deleteFn={deleteCatPassportFile}
        />

        <DocumentSection
          cat={cat}
          onCatUpdate={onCatUpdate}
          label="Medical Documents"
          files={cat.medicalDocuments}
          uploadFn={uploadCatMedicalDocument}
          deleteFn={deleteCatMedicalDocument}
        />

        <DocumentSection
          cat={cat}
          onCatUpdate={onCatUpdate}
          label="Photos"
          files={cat.photos}
          uploadFn={uploadCatPhoto}
          deleteFn={deleteCatPhoto}
          showStatus={false}
        />

        <DocumentSection
          cat={cat}
          onCatUpdate={onCatUpdate}
          label="Videos"
          files={cat.videos}
          uploadFn={uploadCatVideo}
          deleteFn={deleteCatVideo}
          showStatus={false}
        />
      </Stack>
    </SectionCard>
  );
}

export default DocumentsTab;
