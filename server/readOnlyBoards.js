import { TRAVEL } from "../src/constants/boards/travel.js";
import { POST_ADOPTION } from "../src/constants/boards/postAdoption.js";
import { isDatabaseBoard } from "./database/switches.js";
import { readRecords, send } from "./database/boardRecords.js";

// Boards the app only lists (database-first plan 4.7), each with its own
// fields - the same records as the app's mappers make from Monday - and its
// own route, answered from the database when the board is switched on.
// Same access as before: every signed-in user.
//
//   GET /api/travel          [{ id, name, status }]            (TravelMapper)
//   GET /api/post-adoption   [{ id, name, status, escalationRequired }] (PostAdoptionMapper)
//   GET /api/rescuers        [{ id, name }]

const BOARDS = [
  { path: "/api/travel", table: "travel", label: "Travel", fields: { status: { column: TRAVEL.COLUMNS.STATUS } } },
  {
    path: "/api/post-adoption",
    table: "post_adoption",
    label: "Post-Adoption",
    fields: {
      status: { column: POST_ADOPTION.COLUMNS.POST_ADOPTION_STATUS },
      escalationRequired: { column: POST_ADOPTION.COLUMNS.ESCALATION_REQUIRED },
    },
  },
  { path: "/api/rescuers", table: "rescuers", label: "Rescuers", fields: {} },
];

export function registerReadOnlyBoardRoutes(app, { requireAuth }) {
  for (const board of BOARDS) {
    app.get(board.path, requireAuth, (req, res) => {
      if (!isDatabaseBoard(board.table)) {
        return res.status(409).json({ error: `${board.label} is still kept on Monday on this server.` });
      }

      send(res, readRecords(board.table, board.fields), `${board.label} request`);
    });
  }
}
