// Status labels of the Fosters board (server/scripts/createFostersBoard.js).
export const FOSTERS_STATUS_OPTIONS = {
  STATUS: {
    NEW: "New",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    ARCHIVE: "Archive",
    // Added from a shareable Add Cat link by someone who is not in our foster
    // records yet (server/catShareLinks/fosters.js). Becomes Active when their
    // foster application is approved.
    NOT_YET_REGISTERED: "Not yet registered",
  },
  FOSTER_AGREEMENT_SIGNED: {
    PENDING: "Pending",
    SIGNED: "Signed",
    REJECTED: "Rejected",
  },
};
