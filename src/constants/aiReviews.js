import { ACTIVE_APPLICATIONS_STATUS_OPTIONS as S } from "./statuses/activeApplicationsStatuses.js";

// The AI reviews of an application (server/aiReview/). Each run proposes
// values for `fields`; a person accepts the whole draft or discards it.
// Shared by the server (what a provider must answer, checked) and the app
// (labels in the draft dialog and history).

// Application field -> how the AI's value is shaped.
//   type: "text" (free text) | "status" (one of `options`) | "score" (whole number min-max)
export const AI_REVIEW_FIELDS = {
  aiSummary: { label: "AI Summary", type: "text" },
  aiReview: { label: "AI Review", type: "text" },
  aiConcerns: { label: "AI Concerns", type: "text" },
  aiMissingInformation: { label: "AI Missing Information", type: "text" },
  suggestedQuestions: { label: "Suggested Questions", type: "text" },
  suggestedNextAction: { label: "Suggested Next Action", type: "text" },
  aiRecommendation: { label: "AI Recommendation", type: "status", options: Object.values(S.AI_RECOMMENDATION) },
  aiRiskScore: { label: "AI Risk Score", type: "score", min: 0, max: 100, hint: "0-100, higher = riskier" },
  call1Summary: { label: "Call 1 Summary", type: "text" },
  call1Sentiment: { label: "Call 1 Sentiment", type: "status", options: Object.values(S.CALL_1_SENTIMENT) },
  call2Required: { label: "Call 2 Required", type: "status", options: Object.values(S.CALL_2_REQUIRED) },
  call2Summary: { label: "Call 2 Summary", type: "text" },
};

export const AI_REVIEW_KINDS = {
  form_review: {
    label: "Form review",
    fields: ["aiSummary", "aiConcerns", "aiMissingInformation", "suggestedQuestions", "aiRecommendation", "aiRiskScore"],
  },
  call_1_review: {
    label: "Call 1 review",
    call: 1,
    fields: [
      "call1Summary",
      "call1Sentiment",
      "aiReview",
      "aiConcerns",
      "aiMissingInformation",
      "aiRecommendation",
      "aiRiskScore",
      "suggestedNextAction",
      "call2Required",
    ],
  },
  call_2_review: {
    label: "Call 2 review",
    call: 2,
    fields: ["call2Summary", "aiReview", "aiConcerns", "aiMissingInformation", "aiRecommendation", "aiRiskScore", "suggestedNextAction"],
  },
};

export const AI_RUN_STATUS = {
  DRAFT: "draft",
  ACCEPTED: "accepted",
  DISCARDED: "discarded",
  SUPERSEDED: "superseded",
};
