import { useState } from "react";
import { Alert, Box, Button, Divider, Stack, Typography } from "@mui/material";
import { UploadIcon } from "../../../icons";
import SectionCard from "../../../Common/SectionCard";
import RecordField from "../../../Common/RecordField";
import FileDetailsRow from "../../../Common/Files/FileDetailsRow";
import UploadFilesDialog from "../../../Common/Files/UploadFilesDialog";
import ConfirmDeleteFileDialog from "../../../Common/Files/ConfirmDeleteFileDialog";
import { ADOPTION_EDITABLE_FIELDS } from "../../../../services/ActiveApplicationsService";
import { uploadVideo, deleteVideo } from "../../../../services/ScreeningService";

// The home video step: its status fields, review notes and the video
// files, with who uploaded each and when.
function VideoStep({ step, application, save, files, onFilesChange }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      await deleteVideo(application.id, deleteTarget.assetId);
      onFilesChange((current) => current.filter((file) => file.assetId !== deleteTarget.assetId));
    } catch (err) {
      console.error("Failed to delete video:", err);
      setError(err?.message || "Something went wrong while deleting.");
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  return (
    <SectionCard>
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">{`Step ${step}`}</Typography>
          <Typography variant="h6" fontWeight={600}>
            Home video
          </Typography>
        </Box>

        <Box>
          <RecordField
            label="Video submitted"
            kind="select"
            options={ADOPTION_EDITABLE_FIELDS.videoSubmitted.options}
            value={application.videoSubmitted}
            onSave={(value) => save("videoSubmitted", value)}
          />
          <RecordField
            label="Video approved"
            kind="select"
            options={ADOPTION_EDITABLE_FIELDS.videoApproved.options}
            value={application.videoApproved}
            onSave={(value) => save("videoApproved", value)}
          />
          <RecordField label="Review notes" kind="longText" value={application.videoReviewNotes} onSave={(value) => save("videoReviewNotes", value)} />
        </Box>

        <Divider />

        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography sx={{ fontWeight: 600 }}>Video files</Typography>
          <Button size="small" variant="outlined" startIcon={<UploadIcon fontSize="small" />} onClick={() => setUploadOpen(true)}>
            Upload video
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}

        {files.length === 0 ? (
          <Typography color="text.secondary">No video yet.</Typography>
        ) : (
          files.map((file) => <FileDetailsRow key={file.assetId} file={file} onDelete={setDeleteTarget} />)
        )}
      </Stack>

      <UploadFilesDialog
        open={uploadOpen}
        title="Upload the home video"
        accept="video/*"
        upload={(file, { note }) => uploadVideo(application.id, file, { note })}
        onClose={() => setUploadOpen(false)}
        onUploaded={(file) => onFilesChange((current) => [file, ...current.filter((item) => item.assetId !== file.assetId)])}
      />

      <ConfirmDeleteFileDialog
        file={deleteTarget}
        consequence="from this application's home video."
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </SectionCard>
  );
}

export default VideoStep;
