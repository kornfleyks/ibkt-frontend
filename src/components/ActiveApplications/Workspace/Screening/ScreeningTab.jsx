import { useEffect, useState } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import CallStep from "./CallStep";
import VideoStep from "./VideoStep";
import AiDraftNotice from "../AiReview/AiDraftNotice";
import useAiReview from "../AiReview/useAiReview";
import { getScreening } from "../../../../services/ScreeningService";
import { updateAdoptionField } from "../../../../services/ActiveApplicationsService";

const EMPTY_CALL = { files: [], texts: [] };

// The client's screening steps in order: Call 1, the home video, Call 2.
// Transcripts feed "Review call with AI"; the draft it makes is reviewed
// here or on the Overview's AI Review card.
function ScreeningTab({ application, onApplicationChange }) {
  const [screening, setScreening] = useState(null);
  const [error, setError] = useState(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const ai = useAiReview(application.id, onApplicationChange);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);

      try {
        const data = await getScreening(application.id);

        if (!cancelled) setScreening(data);
      } catch (err) {
        console.error("Failed to load screening:", err);

        if (!cancelled) setError(err?.message || "Failed to load the screening details.");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [application.id]);

  async function save(field, value) {
    await updateAdoptionField(application.id, field, value);
    onApplicationChange({ [field]: value ?? "" });
  }

  const setCall = (call) => (update) =>
    setScreening((current) => ({ ...current, calls: { ...current.calls, [call]: update(current.calls[call] ?? EMPTY_CALL) } }));

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!screening) {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: "text.secondary" }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {ai.error && !draftOpen && <Alert severity="error">{ai.error}</Alert>}
      {ai.state && !ai.state.available && <Alert severity="info">AI reviews aren't set up on this server yet. Transcripts can still be added.</Alert>}

      <AiDraftNotice ai={ai} application={application} dialogOpen={draftOpen} onDialogChange={setDraftOpen} />

      <CallStep
        call={1}
        step={1}
        application={application}
        save={save}
        transcripts={screening.calls[1] ?? EMPTY_CALL}
        onTranscriptsChange={setCall(1)}
        ai={ai}
        onReviewed={() => setDraftOpen(true)}
      />

      <VideoStep
        step={2}
        application={application}
        save={save}
        files={screening.video}
        onFilesChange={(update) => setScreening((current) => ({ ...current, video: update(current.video) }))}
      />

      <CallStep
        call={2}
        step={3}
        application={application}
        save={save}
        transcripts={screening.calls[2] ?? EMPTY_CALL}
        onTranscriptsChange={setCall(2)}
        ai={ai}
        onReviewed={() => setDraftOpen(true)}
      />
    </Stack>
  );
}

export default ScreeningTab;
