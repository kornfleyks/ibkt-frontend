import { CheckCircleIcon, CancelIcon, PlayCircleIcon } from "../components/icons";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../constants/statuses/activeApplicationsStatuses";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

const REJECT = {
  stage: ADOPTION_STAGE.REJECTED_APPLICATION,
  label: "Reject",
  color: "error",
  icon: CancelIcon,
  confirmTitle: "Reject this application?",
};

// Stage transitions offered in the application workspace header, keyed by
// the application's current Adoption Stage. `blockedReason` returns why the
// buttons are disabled for this application, or null when they're allowed.
// Stages not listed here show no buttons.
export const APPLICATION_STAGE_ACTIONS = {
  [ADOPTION_STAGE.NEW_APPLICATION]: {
    actions: [
      {
        stage: ADOPTION_STAGE.ACTIVE_APPLICATION,
        label: "Mark Active",
        color: "primary",
        icon: PlayCircleIcon,
        confirmTitle: "Mark this application as active?",
      },
      REJECT,
    ],
    blockedReason: (application) =>
      application.caseOwnerId ? null : "Assign a Case Owner on the Overview tab before moving this application on.",
  },
  [ADOPTION_STAGE.ACTIVE_APPLICATION]: {
    actions: [
      {
        stage: ADOPTION_STAGE.APPROVED_APPLICATION,
        label: "Approve",
        color: "success",
        icon: CheckCircleIcon,
        confirmTitle: "Approve this application?",
      },
      REJECT,
    ],
    blockedReason: (application) =>
      application.linkedCatIds.length === 0
        ? "Link a cat to this application on the Matching page before approving or rejecting it."
        : null,
  },
};
