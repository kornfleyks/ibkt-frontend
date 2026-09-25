import { CATS } from "../src/constants/boards/cats.js";
import { USERS } from "../src/constants/boards/users.js";
import { RESCUERS } from "../src/constants/boards/rescuers.js";
import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { TRAVEL } from "../src/constants/boards/travel.js";
import { POST_ADOPTION } from "../src/constants/boards/postAdoption.js";
import { TASKS } from "../src/constants/boards/tasks.js";

// Which boards show data from which: a board relation or mirror column on
// board A displays items (names, mirrored values) of board B, so a change
// on either can make cached reads of the other stale. Derived from the
// RELATIONS each board constant already declares, in both directions.
const BOARDS = [CATS, USERS, RESCUERS, ACTIVE_APPLICATIONS, TRAVEL, POST_ADOPTION, TASKS];

const related = new Map();

function link(a, b) {
  for (const [from, to] of [[a, b], [b, a]]) {
    if (!related.has(from)) {
      related.set(from, new Set([from]));
    }

    related.get(from).add(to);
  }
}

for (const board of BOARDS) {
  for (const targets of Object.values(board.RELATIONS ?? {})) {
    for (const target of targets) {
      link(String(board.BOARD_ID), String(target));
    }
  }
}

// `boardId` plus every board linked to it (either direction).
export function withRelatedBoards(boardId) {
  const key = String(boardId);

  return related.get(key) ?? new Set([key]);
}
