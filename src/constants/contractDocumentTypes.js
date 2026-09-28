import { ACTIVE_APPLICATIONS } from "./boards/activeApplications.js";

const COLUMNS = ACTIVE_APPLICATIONS.COLUMNS;

// What a file on an application's Contracts tab is (stored by key). A file
// of a type with a status is proof of that step, so uploading one sets the
// application's status to "Yes" (server/contracts.js). `statusField` is the
// application field holding it (ActiveApplicationMapper / applications.js).
export const CONTRACT_DOCUMENT_TYPES = {
  DRAFT: {
    label: "Draft contract",
    statusField: "draftContractGenerated",
    statusColumn: COLUMNS.DRAFT_CONTRACT_GENERATED,
    statusLabel: "Draft Contract Generated",
  },
  FINAL: {
    label: "Final contract (sent)",
    statusField: "finalContractSent",
    statusColumn: COLUMNS.FINAL_CONTRACT_SENT,
    statusLabel: "Final Contract Sent",
  },
  SIGNED: {
    label: "Signed contract",
    statusField: "signedContractReceived",
    statusColumn: COLUMNS.SIGNED_CONTRACT_RECEIVED,
    statusLabel: "Signed Contract Received",
  },
  OTHER: {
    label: "Other",
  },
};

export const CONTRACT_NOTE_MAX_LENGTH = 500;
