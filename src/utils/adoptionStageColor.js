import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../constants/statuses/activeApplicationsStatuses";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

// MUI Chip `color` values per Adoption Stage label, so status pills read
// consistently everywhere they're shown (list cards, detail views).
const STAGE_COLORS = {
  [ADOPTION_STAGE.NEW_APPLICATION]: "info",
  [ADOPTION_STAGE.ACTIVE_APPLICATION]: "warning",
  [ADOPTION_STAGE.APPROVED_APPLICATION]: "success",
  [ADOPTION_STAGE.REJECTED_APPLICATION]: "error",
  [ADOPTION_STAGE.ARCHIVED_APPLICATION]: "default",
  [ADOPTION_STAGE.COMPLETED_APPLICATION]: "secondary",
};

export function getAdoptionStageColor(stage) {
  return STAGE_COLORS[stage] ?? "default";
}
