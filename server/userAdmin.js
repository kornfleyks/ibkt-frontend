import { USERS } from "../src/constants/boards/users.js";
import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { TASKS } from "../src/constants/boards/tasks.js";
import { USERS_STATUS_OPTIONS } from "../src/constants/statuses/usersStatuses.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../src/constants/statuses/activeApplicationsStatuses.js";
import { TASKS_STATUS_OPTIONS } from "../src/constants/statuses/tasksStatuses.js";
import { applyAccountChange, getAccountState } from "./accountState.js";
import { writeCaseOwner } from "./caseOwner.js";
import { clearCache } from "./mondayCache.js";
import { logActivity, getItemName, resolveBoardName } from "./activityLog.js";
import { mondayHeaders } from "./mondayApiVersion.js";
import { mondayFetch } from "./mondayRateLimit.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;

const ITEM_ID_PATTERN = /^\d+$/;
const { ACCOUNT_STATUS } = USERS_STATUS_OPTIONS;
const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
const TASK_STATUS = TASKS_STATUS_OPTIONS.STATUS;

// "Open" work, as agreed: cases in any stage but these, tasks in these.
const CLOSED_CASE_STAGES = [STAGES.REJECTED_APPLICATION, STAGES.ARCHIVED_APPLICATION, STAGES.COMPLETED_APPLICATION];
const OPEN_TASK_STATUSES = [TASK_STATUS.NEW, TASK_STATUS.IN_PROGRESS, TASK_STATUS.WAITING];

// Statuses that take someone out of action - their open work is handed to
// the Admin making the change so nothing is left without an owner.
const HANDOVER_STATUSES = [ACCOUNT_STATUS.SUSPENDED, ACCOUNT_STATUS.ARCHIVED];

// Boards a status change (and its hand-over) writes to.
const HANDOVER_BOARDS = [USERS.BOARD_ID, ACTIVE_APPLICATIONS.BOARD_ID, TASKS.BOARD_ID];

async function mondayDirectRequest(query, variables = {}) {
  const response = await mondayFetch(MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

async function readBoard(boardId, columnIds) {
  const data = await mondayDirectRequest(
    `query ($boardId: ID!, $columnIds: [String!]) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values(ids: $columnIds) {
              id
              text
              ... on BoardRelationValue { linked_item_ids }
            }
          }
        }
      }
    }`,
    { boardId, columnIds },
  );

  return data.boards[0].items_page.items.map((item) => ({
    id: item.id,
    name: item.name,
    columns: Object.fromEntries(item.column_values.map((column) => [column.id, column])),
  }));
}

function ownedBy(column, userId) {
  return (column?.linked_item_ids ?? []).map(String).includes(String(userId));
}

// { cases: [{id, name, stage}], tasks: [{id, name, status}] } owned by userId.
export async function getOpenWork(userId) {
  const [applications, tasks] = await Promise.all([
    readBoard(ACTIVE_APPLICATIONS.BOARD_ID, [ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER, ACTIVE_APPLICATIONS.COLUMNS.ADOPTION_STAGE]),
    readBoard(TASKS.BOARD_ID, [TASKS.COLUMNS.OWNER, TASKS.COLUMNS.STATUS]),
  ]);

  return {
    cases: applications
      .filter((item) => ownedBy(item.columns[ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER], userId))
      .map((item) => ({ id: item.id, name: item.name, stage: item.columns[ACTIVE_APPLICATIONS.COLUMNS.ADOPTION_STAGE]?.text ?? "" }))
      .filter((item) => !CLOSED_CASE_STAGES.includes(item.stage)),
    tasks: tasks
      .filter((item) => ownedBy(item.columns[TASKS.COLUMNS.OWNER], userId))
      .map((item) => ({ id: item.id, name: item.name, status: item.columns[TASKS.COLUMNS.STATUS]?.text ?? "" }))
      .filter((item) => OPEN_TASK_STATUSES.includes(item.status)),
  };
}

async function changeColumnValue(boardId, itemId, columnId, value) {
  await mondayDirectRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }`,
    { boardId, itemId, columnId, value: JSON.stringify(value) },
  );
}

function actorOf(req) {
  return { id: req.user.sub, name: `${req.user.firstName} ${req.user.lastName}`.trim() };
}

// Hands every open case and task of `userId` to `actor`. Sequential (small
// numbers, and keeps within Monday's rate limits); each move is logged on
// its item so the item's Activity tab shows why its owner changed.
async function handOverOpenWork(userId, userName, actor) {
  const work = await getOpenWork(userId);
  const moved = { cases: 0, tasks: 0 };
  const failed = [];

  for (const item of work.cases) {
    try {
      await writeCaseOwner(item.id, actor.id);
      moved.cases += 1;

      logActivity({
        actorId: actor.id,
        actorName: actor.name,
        boardId: ACTIVE_APPLICATIONS.BOARD_ID,
        boardName: resolveBoardName(ACTIVE_APPLICATIONS.BOARD_ID),
        itemId: item.id,
        itemName: item.name,
        actionType: "Updated",
        description: `${actor.name} took over Case Owner on ${item.name} from ${userName}`,
        fieldChanged: "Case Owner",
        oldValue: userName,
        newValue: actor.name,
      });
    } catch (err) {
      console.error(`Hand-over: failed to reassign case ${item.id}:`, err.message);
      failed.push(`case "${item.name}"`);
    }
  }

  for (const item of work.tasks) {
    try {
      await changeColumnValue(TASKS.BOARD_ID, item.id, TASKS.COLUMNS.OWNER, { item_ids: [Number(actor.id)] });
      moved.tasks += 1;

      logActivity({
        actorId: actor.id,
        actorName: actor.name,
        boardId: TASKS.BOARD_ID,
        boardName: resolveBoardName(TASKS.BOARD_ID),
        itemId: item.id,
        itemName: item.name,
        actionType: "Updated",
        description: `${actor.name} took over task "${item.name}" from ${userName}`,
        fieldChanged: "Owner",
        oldValue: userName,
        newValue: actor.name,
      });
    } catch (err) {
      console.error(`Hand-over: failed to reassign task ${item.id}:`, err.message);
      failed.push(`task "${item.name}"`);
    }
  }

  return { moved, failed };
}

export function registerUserAdminRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/admin/users/:id/open-work", requireAuth, requireAdmin, async (req, res) => {
    if (!ITEM_ID_PATTERN.test(req.params.id)) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    try {
      res.json(await getOpenWork(req.params.id));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load this user's open work." });
    }
  });

  // Body: { status }. Suspend/Archive first hand the user's open cases and
  // tasks to the acting Admin; the status only changes if that fully worked.
  app.post("/api/admin/users/:id/status", requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body ?? {};
    const actor = actorOf(req);

    if (!ITEM_ID_PATTERN.test(id) || !Object.values(ACCOUNT_STATUS).includes(status)) {
      return res.status(400).json({ error: "Invalid user id or status." });
    }

    if (String(id) === String(actor.id) && status !== ACCOUNT_STATUS.ACTIVE) {
      return res.status(400).json({ error: "You can't change your own account's status." });
    }

    try {
      const userName = (await getItemName(id)) || `user ${id}`;
      let moved = { cases: 0, tasks: 0 };

      if (HANDOVER_STATUSES.includes(status)) {
        const handOver = await handOverOpenWork(id, userName, actor);
        moved = handOver.moved;

        if (handOver.failed.length > 0) {
          clearCache(HANDOVER_BOARDS);
          return res.status(502).json({
            error: `Couldn't reassign ${handOver.failed.join(", ")}. The status was not changed - try again.`,
            reassigned: moved,
          });
        }
      }

      await changeColumnValue(USERS.BOARD_ID, id, USERS.COLUMNS.ACCOUNT_STATUS, { label: status });
      // Loads an account registered since startup, so e.g. a just-approved
      // user is mentionable straight away rather than after their first login.
      await getAccountState(id);
      applyAccountChange(id, { accountStatus: status });
      clearCache(HANDOVER_BOARDS);

      const handOverText = moved.cases || moved.tasks
        ? `; reassigned ${moved.cases} case(s) and ${moved.tasks} task(s) to ${actor.name}`
        : "";

      logActivity({
        actorId: actor.id,
        actorName: actor.name,
        boardId: USERS.BOARD_ID,
        boardName: resolveBoardName(USERS.BOARD_ID),
        itemId: id,
        itemName: userName,
        actionType: "Updated",
        description: `${actor.name} set ${userName}'s account to ${status}${handOverText}`,
        fieldChanged: "Account Status",
        newValue: status,
      });

      res.json({ accountStatus: status, reassigned: moved });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to change the account status." });
    }
  });
}
