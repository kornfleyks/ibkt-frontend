import { useState } from "react";
import { Alert, Button, Chip, CircularProgress, Link, Stack, Typography } from "@mui/material";
import SectionCard from "../../../Common/SectionCard";
import InfoRow from "../../../Common/InfoRow";
import useDateFormat from "../../../../hooks/useDateFormat";
import { AI_RUN_STATUS } from "../../../../constants/aiReviews";
import useAiReview from "./useAiReview";
import AiDraftNotice from "./AiDraftNotice";
import AiHistoryDialog from "./AiHistoryDialog";
import { kindLabel, RECOMMENDATION_COLORS } from "./aiText";

const LABEL_WIDTH = 190;

function Text({ value }) {
  return value ? (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{value}</Typography>
  ) : (
    <Typography color="text.secondary">Not set</Typography>
  );
}

// The application's current AI assessment (accepted values only), the
// "Review form with AI" run, the waiting draft and the AI history.
function AiReviewCard({ application, onApplicationChange }) {
  const { formatDateTime } = useDateFormat();
  const ai = useAiReview(application.id, onApplicationChange);
  const [draftOpen, setDraftOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const runs = ai.state?.runs ?? [];
  const lastAccepted = runs.find((run) => run.status === AI_RUN_STATUS.ACCEPTED);

  async function reviewForm() {
    if (await ai.start("form_review")) setDraftOpen(true);
  }

  return (
    <SectionCard>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="h6" fontWeight={600}>
              AI Review
            </Typography>
            {ai.state?.mock && <Chip label="Mock AI" size="small" color="warning" variant="outlined" />}
          </Stack>

          <Button variant="outlined" onClick={reviewForm} disabled={ai.busy || !ai.state?.available}>
            {ai.busy ? <CircularProgress size={16} sx={{ color: "inherit" }} /> : "Review form with AI"}
          </Button>
        </Stack>

        {ai.state && !ai.state.available && <Alert severity="info">AI reviews aren't set up on this server yet.</Alert>}
        {ai.error && !draftOpen && <Alert severity="error">{ai.error}</Alert>}

        <AiDraftNotice ai={ai} application={application} dialogOpen={draftOpen} onDialogChange={setDraftOpen} />

        <Stack spacing={0.5}>
          <InfoRow
            label="Recommendation"
            labelWidth={LABEL_WIDTH}
            value={
              application.aiRecommendation ? (
                <Chip label={application.aiRecommendation} size="small" color={RECOMMENDATION_COLORS[application.aiRecommendation] ?? "default"} />
              ) : (
                <Typography color="text.secondary">Not set</Typography>
              )
            }
          />
          <InfoRow
            label="Risk score"
            labelWidth={LABEL_WIDTH}
            value={application.aiRiskScore !== "" && application.aiRiskScore !== undefined ? `${application.aiRiskScore} / 100` : "Not set"}
          />
          <InfoRow label="Summary" labelWidth={LABEL_WIDTH} value={<Text value={application.aiSummary} />} />
          <InfoRow label="Review" labelWidth={LABEL_WIDTH} value={<Text value={application.aiReview} />} />
          <InfoRow label="Concerns" labelWidth={LABEL_WIDTH} value={<Text value={application.aiConcerns} />} />
          <InfoRow label="Missing information" labelWidth={LABEL_WIDTH} value={<Text value={application.aiMissingInformation} />} />
          <InfoRow label="Suggested next action" labelWidth={LABEL_WIDTH} value={<Text value={application.suggestedNextAction} />} />
          <InfoRow label="Suggested questions" labelWidth={LABEL_WIDTH} value={<Text value={application.suggestedQuestions} />} />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {lastAccepted
              ? `Last updated from: ${kindLabel(lastAccepted.kind)}, accepted by ${lastAccepted.decidedBy?.name ?? "someone"}, ${formatDateTime(new Date(lastAccepted.decidedAt))}`
              : "No AI review accepted yet. Call reviews are run from the Screening tab."}
          </Typography>

          <Link component="button" variant="body2" onClick={() => setHistoryOpen(true)} disabled={!runs.length}>
            {`AI history (${runs.length})`}
          </Link>
        </Stack>
      </Stack>

      <AiHistoryDialog open={historyOpen} applicationId={application.id} runs={runs} onClose={() => setHistoryOpen(false)} />
    </SectionCard>
  );
}

export default AiReviewCard;
