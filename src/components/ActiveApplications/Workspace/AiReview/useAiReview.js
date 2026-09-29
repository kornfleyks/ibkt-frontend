import { useCallback, useEffect, useState } from "react";
import { getAiReviewState, startAiReview, acceptAiReview, discardAiReview } from "../../../../services/AiReviewService";

// The application's AI review state (open draft, history, whether AI is
// available) and its actions. Used by the Overview's AI Review card and the
// Screening tab. `onApplicationChange` receives the saved values when a
// draft is accepted, so the page shows them at once.
function useAiReview(applicationId, onApplicationChange) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setState(await getAiReviewState(applicationId));
    } catch (err) {
      console.error("Failed to load AI reviews:", err);
      setError(err?.message || "Failed to load the AI reviews.");
    }
  }, [applicationId]);

  useEffect(() => {
    let cancelled = false;

    getAiReviewState(applicationId)
      .then((data) => !cancelled && setState(data))
      .catch((err) => {
        console.error("Failed to load AI reviews:", err);

        if (!cancelled) setError(err?.message || "Failed to load the AI reviews.");
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  async function act(work) {
    setBusy(true);
    setError(null);

    try {
      return await work();
    } catch (err) {
      console.error("AI review action failed:", err);
      setError(err?.message || "Something went wrong with the AI review.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Answers the new draft (or null on failure).
  const start = (kind) =>
    act(async () => {
      const run = await startAiReview(applicationId, kind);

      await reload();
      return run;
    });

  const accept = (run) =>
    act(async () => {
      const { values } = await acceptAiReview(applicationId, run.id);

      onApplicationChange?.(values);
      await reload();
      return true;
    });

  const discard = (run) =>
    act(async () => {
      await discardAiReview(applicationId, run.id);
      await reload();
      return true;
    });

  return { state, busy, error, start, accept, discard, reload };
}

export default useAiReview;
