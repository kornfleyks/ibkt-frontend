import { POST_ADOPTION_STATUS_OPTIONS } from "../../../../constants/statuses/postAdoptionStatuses";

const { POST_ADOPTION_STATUS, ESCALATION_REQUIRED, AI_CONCERN_FLAG } = POST_ADOPTION_STATUS_OPTIONS;
const CHECK_IN = POST_ADOPTION_STATUS_OPTIONS.CHECK_IN_24H_CHECK_IN_STATUS;

// MUI chip colours for the post-adoption statuses.
export const RECORD_STATUS_COLORS = {
  [POST_ADOPTION_STATUS.ACTIVE]: "info",
  [POST_ADOPTION_STATUS.WAITING_FOR_RESPONSE]: "warning",
  [POST_ADOPTION_STATUS.CONCERN]: "error",
  [POST_ADOPTION_STATUS.COMPLETED]: "success",
};

export const ESCALATION_COLORS = {
  [ESCALATION_REQUIRED.NO]: "success",
  [ESCALATION_REQUIRED.YES]: "warning",
  [ESCALATION_REQUIRED.URGENT]: "error",
};

export const AI_FLAG_COLORS = {
  [AI_CONCERN_FLAG.GREEN]: "success",
  [AI_CONCERN_FLAG.YELLOW]: "warning",
  [AI_CONCERN_FLAG.RED]: "error",
};

export const CHECK_IN_COLORS = {
  [CHECK_IN.RECEIVED]: "success",
  [CHECK_IN.SENT]: "info",
  [CHECK_IN.NO_RESPONSE]: "warning",
  [CHECK_IN.CONCERN]: "error",
};
