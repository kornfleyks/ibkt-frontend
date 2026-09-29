import { serverGet, serverPost } from "./MondayService";

// AI reviews of an application (server/aiReview/). A run makes a draft;
// accepting saves the whole draft into the application, discarding
// changes nothing. Kinds and fields: constants/aiReviews.js.

const base = (applicationId) => `/api/applications/${applicationId}/ai`;

// { provider, available, mock, draft | null, runs }
export function getAiReviewState(applicationId) {
  return serverGet(base(applicationId));
}

// kind: "form_review" | "call_1_review" | "call_2_review" -> the new draft.
export async function startAiReview(applicationId, kind) {
  const { run } = await serverPost(`${base(applicationId)}/reviews`, { kind });

  return run;
}

// A run with its input, for the history.
export async function getAiReview(applicationId, runId) {
  const { run } = await serverGet(`${base(applicationId)}/reviews/${runId}`);

  return run;
}

// -> { run, values } (the application fields as saved).
export function acceptAiReview(applicationId, runId) {
  return serverPost(`${base(applicationId)}/reviews/${runId}/accept`, {});
}

export async function discardAiReview(applicationId, runId) {
  const { run } = await serverPost(`${base(applicationId)}/reviews/${runId}/discard`, {});

  return run;
}
