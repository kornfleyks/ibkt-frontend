import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import CallStep from "./CallStep";
import VideoStep from "./VideoStep";
import AiDraftNotice from "../AiReview/AiDraftNotice";
import useAiReview from "../AiReview/useAiReview";
import { aiReviewKind } from "../../../../constants/aiReviews";
import { getScreening, addExtraCall, updateExtraCall, deleteExtraCall } from "../../../../services/ScreeningService";
import { updateAdoptionField } from "../../../../services/ActiveApplicationsService";

const EMPTY_CALL = { files: [], texts: [] };

// The client's screening steps in order: Call 1, the home video, Call 2,
// then any extra calls (Call 3 and above, added with "Add call"). Transcripts
// feed "Review call with AI"; the draft it makes is reviewed here or on the
// Overview's AI Review card.
function ScreeningTab({ application, onApplicationChange }) {
  const [screening, setScreening] = useState(null);
  const [error, setError] = useState(null);
  const [callError, setCallError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);

  // An accepted extra-call review also saves that call's summary: show it
  // here, and keep the rest for the application.
  function handleAccepted(values, run) {
    const { callSummary, ...applicationValues } = values;
    const call = aiReviewKind(run?.kind)?.call;

    if (callSummary !== undefined && call) updateExtra(call, (current) => ({ ...current, summary: callSummary }));

    onApplicationChange(applicationValues);
  }

  const ai = useAiReview(application.id, handleAccepted);

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

  // Changes one extra call in place; `update` gets the call and answers it.
  function updateExtra(call, update) {
    setScreening((current) => ({
      ...current,
      extraCalls: (current?.extraCalls ?? []).map((entry) => (entry.call === call ? update(entry) : entry)),
    }));
  }

  async function handleAddCall() {
    setAdding(true);
    setCallError(null);

    try {
      const created = await addExtraCall(application.id);

      setScreening((current) => ({ ...current, extraCalls: [...(current.extraCalls ?? []), created] }));
    } catch (err) {
      console.error("Failed to add the call:", err);
      setCallError(err?.message || "Something went wrong while adding the call.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveCall(call, changes) {
    const saved = await updateExtraCall(application.id, call, changes);

    updateExtra(call, (entry) => ({ ...entry, ...saved }));
  }

  async function handleDeleteCall(call) {
    await deleteExtraCall(application.id, call);
    setScreening((current) => ({ ...current, extraCalls: current.extraCalls.filter((entry) => entry.call !== call) }));
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!screening) {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: "text.secondary" }} />
      </Stack>
    );
  }

  const extraCalls = screening.extraCalls ?? [];
  // The draft dialog shows the current value of a field next to the AI's: for
  // an extra call's summary that is the call's own.
  const draftCall = aiReviewKind(ai.state?.draft?.kind)?.call;
  const draftApplication = { ...application, callSummary: extraCalls.find((entry) => entry.call === draftCall)?.summary ?? "" };

  return (
    <Stack spacing={3}>
      {ai.error && !draftOpen && <Alert severity="error">{ai.error}</Alert>}
      {ai.state && !ai.state.available && <Alert severity="info">AI reviews aren't set up on this server yet. Transcripts can still be added.</Alert>}

      <AiDraftNotice ai={ai} application={draftApplication} dialogOpen={draftOpen} onDialogChange={setDraftOpen} />

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

      {extraCalls.map((entry) => (
        <CallStep
          key={entry.call}
          call={entry.call}
          application={application}
          save={save}
          transcripts={{ files: entry.files, texts: entry.texts }}
          onTranscriptsChange={(update) => updateExtra(entry.call, (current) => ({ ...current, ...update({ files: current.files, texts: current.texts }) }))}
          ai={ai}
          onReviewed={() => setDraftOpen(true)}
          extra={{
            date: entry.date,
            summary: entry.summary,
            onSave: (changes) => handleSaveCall(entry.call, changes),
            onDelete: () => handleDeleteCall(entry.call),
          }}
        />
      ))}

      {callError && <Alert severity="error">{callError}</Alert>}

      <Stack direction="row">
        <Button variant="outlined" onClick={handleAddCall} disabled={adding}>
          {adding ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Add call"}
        </Button>
      </Stack>
    </Stack>
  );
}

export default ScreeningTab;
