import { useState } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { UploadIcon } from "../../../icons";
import SectionCard from "../../../Common/SectionCard";
import FileDetailsRow from "../../../Common/Files/FileDetailsRow";
import UploadFilesDialog from "../../../Common/Files/UploadFilesDialog";
import ConfirmDeleteFileDialog from "../../../Common/Files/ConfirmDeleteFileDialog";
import { uploadPostAdoptionPhoto, deletePostAdoptionPhoto } from "../../../../services/PostAdoptionService";

// Photos / Videos Received, with who uploaded each and when (same file
// details as Contracts).
function PhotosSection({ applicationId, recordId, photos, onPhotosChange }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      await deletePostAdoptionPhoto(applicationId, recordId, deleteTarget.assetId);
      onPhotosChange((current) => current.filter((photo) => photo.assetId !== deleteTarget.assetId));
    } catch (err) {
      console.error("Failed to delete photo:", err);
      setError(err?.message || "Something went wrong while deleting.");
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  return (
    <SectionCard>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Photos and videos
          </Typography>

          <Button variant="outlined" startIcon={<UploadIcon fontSize="small" />} onClick={() => setUploadOpen(true)}>
            Upload
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}

        {photos.length === 0 ? (
          <Typography color="text.secondary">No photos or videos received yet.</Typography>
        ) : (
          photos.map((photo) => <FileDetailsRow key={photo.assetId} file={photo} onDelete={setDeleteTarget} />)
        )}
      </Stack>

      <UploadFilesDialog
        open={uploadOpen}
        title="Upload photos and videos"
        accept="image/*,video/*"
        upload={(file, { note }) => uploadPostAdoptionPhoto(applicationId, recordId, file, { note })}
        onClose={() => setUploadOpen(false)}
        onUploaded={(photo) => onPhotosChange((current) => [photo, ...current.filter((item) => item.assetId !== photo.assetId)])}
      />

      <ConfirmDeleteFileDialog
        file={deleteTarget}
        consequence="from this adoption's photos and videos."
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </SectionCard>
  );
}

export default PhotosSection;
