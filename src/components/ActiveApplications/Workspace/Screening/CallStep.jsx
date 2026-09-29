import { useState } from "react";
import { Alert, Box, Button, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import { UploadIcon } from "../../../icons";
import SectionCard from "../../../Common/SectionCard";
import RecordField from "../../../Common/RecordField";
import FileDetailsRow from "../../../Common/Files/FileDetailsRow";
import UploadFilesDialog from "../../../Common/Files/UploadFilesDialog";
import ConfirmDeleteFileDialog from "../../../Common/Files/ConfirmDeleteFileDialog";
import PasteTranscriptDialog from "./PasteTranscriptDialog";
import PastedTranscriptRow from "./PastedTranscriptRow";
import { ADOPTION_EDITABLE_FIELDS } from "../../../../services/ActiveApplicationsService";
import { uploadTranscriptFile, deleteTranscriptFile, addTranscriptText, deleteTranscriptText } from "../../../../services/ScreeningService";

const TRANSCRIPT_FILE_TYPES = ".txt,.vtt,.srt,.docx,.pdf,text/plain,text/vtt,application/pdf";

const optionsOf = (field) => ADOPTION_EDITABLE_FIELDS[field].options;

// One screening call: its fields, its transcripts (uploaded files and
// pasted text) and "Review call with AI". Call 2 is greyed out until Call 2
// Required is Yes; the Required field itself stays editable.
function CallStep({ call, step, application, save, transcripts, onTranscriptsChange, ai, onReviewed }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const inactive = call === 2 && application.call2Required !== "Yes";
  const field = (name) => `call${call}${name}`;
  const hasTranscript = transcripts.files.length + transcripts.texts.length > 0;

  async function confirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      if (deleteTarget.kind === "file") {
        await deleteTranscriptFile(application.id, call, deleteTarget.item.assetId);
        onTranscriptsChange((current) => ({ ...current, files: current.files.filter((file) => file.assetId !== deleteTarget.item.assetId) }));
      } else {
        await deleteTranscriptText(application.id, call, deleteTarget.item.id);
        onTranscriptsChange((current) => ({ ...current, texts: current.texts.filter((text) => text.id !== deleteTarget.item.id) }));
      }
    } catch (err) {
      console.error("Failed to delete transcript:", err);
      setError(err?.message || "Something went wrong while deleting.");
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  }

  async function review() {
    if (await ai.start(`call_${call}_review`)) onReviewed();
  }

  return (
    <SectionCard>
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">{`Step ${step}`}</Typography>
          <Typography variant="h6" fontWeight={600}>{`Call ${call}`}</Typography>
        </Box>

        {call === 2 && (
          <RecordField
            label="Call 2 required"
            kind="select"
            options={optionsOf("call2Required")}
            value={application.call2Required}
            onSave={(value) => save("call2Required", value)}
          />
        )}

        <Box sx={inactive ? { opacity: 0.5 } : undefined}>
          {inactive && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Set "Call 2 required" to Yes to use this step.
            </Typography>
          )}

          <Box sx={inactive ? { pointerEvents: "none" } : undefined} aria-disabled={inactive || undefined}>
            <RecordField label="Date" kind="date" value={application[field("Date")]} onSave={(value) => save(field("Date"), value)} />
            {call === 1 && (
              <>
                <RecordField label="Completed" kind="select" options={optionsOf("call1Completed")} value={application.call1Completed} onSave={(value) => save("call1Completed", value)} />
                <RecordField label="Sentiment" kind="select" options={optionsOf("call1Sentiment")} value={application.call1Sentiment} onSave={(value) => save("call1Sentiment", value)} />
              </>
            )}
            <RecordField label="Summary" kind="longText" value={application[field("Summary")]} onSave={(value) => save(field("Summary"), value)} />

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
              <Typography sx={{ fontWeight: 600 }}>Transcript</Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                <Button size="small" variant="outlined" startIcon={<UploadIcon fontSize="small" />} onClick={() => setUploadOpen(true)}>
                  Upload file
                </Button>
                <Button size="small" variant="outlined" onClick={() => setPasteOpen(true)}>
                  Paste text
                </Button>
                <Button size="small" variant="contained" onClick={review} disabled={ai.busy || !ai.state?.available || !hasTranscript}>
                  {ai.busy ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Review call with AI"}
                </Button>
              </Stack>
            </Stack>

            {error && (
              <Alert severity="error" sx={{ mb: 1.5, fontSize: "0.8125rem" }}>
                {error}
              </Alert>
            )}

            <Stack spacing={1}>
              {!hasTranscript && <Typography color="text.secondary">No transcript yet. Upload the file from the call tool, or paste the text.</Typography>}
              {transcripts.files.map((file) => (
                <FileDetailsRow key={file.assetId} file={file} onDelete={(item) => setDeleteTarget({ kind: "file", item })} />
              ))}
              {transcripts.texts.map((text) => (
                <PastedTranscriptRow key={text.id} transcript={text} onDelete={(item) => setDeleteTarget({ kind: "text", item })} />
              ))}
            </Stack>
          </Box>
        </Box>
      </Stack>

      <UploadFilesDialog
        open={uploadOpen}
        title={`Upload the Call ${call} transcript`}
        accept={TRANSCRIPT_FILE_TYPES}
        upload={(file, { note }) => uploadTranscriptFile(application.id, call, file, { note })}
        onClose={() => setUploadOpen(false)}
        onUploaded={(file) => onTranscriptsChange((current) => ({ ...current, files: [file, ...current.files.filter((item) => item.assetId !== file.assetId)] }))}
      />

      <PasteTranscriptDialog
        open={pasteOpen}
        call={call}
        onClose={() => setPasteOpen(false)}
        onSave={async (text) => {
          const transcript = await addTranscriptText(application.id, call, text);

          onTranscriptsChange((current) => ({ ...current, texts: [transcript, ...current.texts] }));
        }}
      />

      <ConfirmDeleteFileDialog
        file={deleteTarget && { name: deleteTarget.kind === "file" ? deleteTarget.item.name : "The pasted transcript" }}
        consequence={`from Call ${call}.`}
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </SectionCard>
  );
}

export default CallStep;
