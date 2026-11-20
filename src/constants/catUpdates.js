import { CATS_STATUS_OPTIONS } from "./statuses/catsStatuses.js";

// The update check for cats waiting for a home (docs/cat-update-check.md, the
// client brief: "3-month update trigger for unadopted cats"). A cat that has
// been Adoption Ready for UPDATE_AFTER_MONTHS gets its Update Requested flag
// set to Requested and the Admins and Volunteers are told to ask the rescuer
// or foster for news. Someone records the news with "Update received", which
// restarts the clock. A request nobody answers for OVERDUE_AFTER_DAYS becomes
// Overdue. Shared by the server (the daily check) and the cat page.

export const UPDATE_AFTER_MONTHS = 3;
export const OVERDUE_AFTER_DAYS = 14;

// The Update Requested labels of the Cats board.
export const UPDATE_FLAG = CATS_STATUS_OPTIONS.UPDATE_REQUESTED;

export const UPDATE_NOTE_MAX_LENGTH = 500;
