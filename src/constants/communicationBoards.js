import { CATS } from "./boards/cats.js";

// Boards whose items have a Communications thread (Monday updates on the
// item). The server only accepts posts for these, and a mention
// notification links to `link(itemId)`. To add Communications to another
// board (e.g. Applications), add an entry here and render the thread on
// that board's workspace.
export const COMMUNICATION_BOARDS = {
  [CATS.BOARD_ID]: {
    name: "Cats",
    link: (itemId) => `/cats/${itemId}?tab=communications`,
  },
};
