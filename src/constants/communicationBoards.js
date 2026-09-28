import { CATS } from "./boards/cats.js";
import { ACTIVE_APPLICATIONS } from "./boards/activeApplications.js";

// Boards whose items have a Communications thread (Monday updates on the
// item). The server only accepts posts for these, and a mention
// notification links to `link(itemId)`. To add Communications to another
// board, add an entry here and render the thread on that board's workspace
// (and, if not everyone may see its items, a rule in THREAD_ACCESS in
// server/communications.js).
export const COMMUNICATION_BOARDS = {
  [CATS.BOARD_ID]: {
    name: "Cats",
    link: (itemId) => `/cats/${itemId}?tab=communications`,
  },
  [ACTIVE_APPLICATIONS.BOARD_ID]: {
    name: "Active Applications",
    link: (itemId) => `/active-applications/${itemId}?tab=communications`,
  },
};
