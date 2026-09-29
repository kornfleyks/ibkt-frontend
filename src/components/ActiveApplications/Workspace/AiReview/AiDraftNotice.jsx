import { Alert, Button } from "@mui/material";
import useDateFormat from "../../../../hooks/useDateFormat";
import AiDraftDialog from "./AiDraftDialog";
import { kindLabel } from "./aiText";

// "A draft is waiting" with its review dialog, for wherever an AI review
// can be started (Overview, Screening). `ai` is useAiReview's result;
// `dialogOpen` / `onDialogChange` let the caller open it right after a run.
function AiDraftNotice({ ai, application, dialogOpen, onDialogChange }) {
  const { formatDateTime } = useDateFormat();
  const draft = ai.state?.draft;

  if (!draft) return null;

  return (
    <>
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={() => onDialogChange(true)}>
            Review draft
          </Button>
        }
      >
        {`New AI draft: ${kindLabel(draft.kind)} (${formatDateTime(new Date(draft.createdAt))}${draft.createdBy ? `, ${draft.createdBy.name}` : ""})`}
      </Alert>

      <AiDraftDialog
        open={dialogOpen}
        run={draft}
        application={application}
        mock={ai.state?.mock}
        busy={ai.busy}
        error={ai.error}
        onClose={() => onDialogChange(false)}
        onAccept={async () => (await ai.accept(draft)) && onDialogChange(false)}
        onDiscard={async () => (await ai.discard(draft)) && onDialogChange(false)}
      />
    </>
  );
}

export default AiDraftNotice;
