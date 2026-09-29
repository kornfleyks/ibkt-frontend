import { AI_REVIEW_FIELDS, AI_REVIEW_KINDS, AI_RUN_STATUS } from "../../../../constants/aiReviews";

export function kindLabel(kind) {
  return AI_REVIEW_KINDS[kind]?.label ?? kind;
}

export function fieldLabel(key) {
  return AI_REVIEW_FIELDS[key]?.label ?? key;
}

export const RUN_STATUS_TEXT = {
  [AI_RUN_STATUS.DRAFT]: { label: "Draft", color: "info" },
  [AI_RUN_STATUS.ACCEPTED]: { label: "Accepted", color: "success" },
  [AI_RUN_STATUS.DISCARDED]: { label: "Discarded", color: "default" },
  [AI_RUN_STATUS.SUPERSEDED]: { label: "Replaced by a newer run", color: "default" },
};

export const RECOMMENDATION_COLORS = {
  Proceed: "success",
  "Needs Review": "warning",
  "High Risk": "error",
};

// A value as shown in the dialogs ("Not set" for empty).
export function shownValue(value) {
  return value === null || value === undefined || value === "" ? "Not set" : String(value);
}
