import { USERS } from "../src/constants/boards/users.js";
import { isSuperAdminEmail, canDeleteUsers } from "../src/constants/roles.js";
import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { TASKS } from "../src/constants/boards/tasks.js";
import { USERS_STATUS_OPTIONS } from "../src/constants/statuses/usersStatuses.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../src/constants/statuses/activeApplicationsStatuses.js";
import { TASKS_STATUS_OPTIONS } from "../src/constants/statuses/tasksStatuses.js";
import { applyAccountChange, getAccountState, removeAccount } from "./accountState.js";
import { writeCaseOwner } from "./caseOwner.js";
import { clearCache } from "./mondayCache.js";
import { logActivity, getItemName, resolveBoardName } from "./activityLog.js";
import { mondayHeaders } from "./mondayApiVersion.js";
import { mondayFetch } from "./mondayRateLimit.js";
import { isDatabaseBoard } from "./database/switches.js";
import { listTasks, changeTask } from "./database/tasksStore.js";
import { listApplications } from "./applications.js";
import { setUserValues, deleteUser } from "./database/usersStore.js";
import { sendAccountApprovedEmail, sendTestEmail } from "./mail/accountEmails.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;

const ITEM_ID_PATTERN = /^\d+$/;
const { ACCOUNT_STATUS } = USERS_STATUS_OPTIONS;
const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
const TASK_STATUS = TASKS_STATUS_OPTIONS.STATUS;

// "Open" work, as agreed: cases in any stage but these, tasks in these.
const CLOSED_CASE_STAGES = [STAGES.REJECTED_APPLICATION, STAGES.ARCHIVED_APPLICATION, STAGES.COMPLETED_APPLICATION];
const OPEN_TASK_STATUSES = [TASK_STATUS.NEW, TASK_STATUS.IN_PROGRESS, TASK_STATUS.WAITING];

// Statuses that take someone out of action - their open work is handed to
// the Admin making the change so nothing is left without an owner. Blocked
// isn't one: it's a temporary lock (signed out, can't sign in) that leaves
// their cases and tasks where they are.
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
// Tasks from the database when that board is switched on (DATABASE_BOARDS).
async function openTasksOf(userId) {
  if (isDatabaseBoard("tasks")) {
    return (await listTasks())
      .filter((task) => task.ownerId === String(userId) && OPEN_TASK_STATUSES.includes(task.status))
      .map((task) => ({ id: task.id, name: task.itemName, status: task.status }));
  }

  return (await readBoard(TASKS.BOARD_ID, [TASKS.COLUMNS.OWNER, TASKS.COLUMNS.STATUS]))
    .filter((item) => ownedBy(item.columns[TASKS.COLUMNS.OWNER], userId))
    .map((item) => ({ id: item.id, name: item.name, status: item.columns[TASKS.COLUMNS.STATUS]?.text ?? "" }))
    .filter((item) => OPEN_TASK_STATUSES.includes(item.status));
}

// Cases from the database when Applications is switched on.
async function openCasesOf(userId) {
  if (isDatabaseBoard("applications")) {
    return (await listApplications())
      .filter((application) => application.caseOwnerId === String(userId) && !CLOSED_CASE_STAGES.includes(application.adoptionStage))
      .map((application) => ({ id: application.id, name: application.name, stage: application.adoptionStage }));
  }

  return (await readBoard(ACTIVE_APPLICATIONS.BOARD_ID, [ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER, ACTIVE_APPLICATIONS.COLUMNS.ADOPTION_STAGE]))
    .filter((item) => ownedBy(item.columns[ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER], userId))
    .map((item) => ({ id: item.id, name: item.name, stage: item.columns[ACTIVE_APPLICATIONS.COLUMNS.ADOPTION_STAGE]?.text ?? "" }))
    .filter((item) => !CLOSED_CASE_STAGES.includes(item.stage));
}

export async function getOpenWork(userId) {
  const [cases, tasks] = await Promise.all([openCasesOf(userId), openTasksOf(userId)]);

  return { cases, tasks };
}

// create_labels_if_missing: a status label the app added (e.g. Blocked) is
// created on Monday the first time it's written.
async function changeColumnValue(boardId, itemId, columnId, value) {
  await mondayDirectRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value, create_labels_if_missing: true) { id }
    }`,
    { boardId, itemId, columnId, value: JSON.stringify(value) },
  );
}

function actorOf(req) {
  return { id: req.user.sub, name: `${req.user.firstName} ${req.user.lastName}`.trim() };
}

// Deletes the Monday item outright - not the generic board_relation-aware
// boardStore.deleteItem, which only queues this for the nightly sync.
async function deleteItemOnMonday(itemId) {
  await mondayDirectRequest(`mutation ($itemId: ID!) { delete_item(item_id: $itemId) { id } }`, { itemId });
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
      if (isDatabaseBoard("tasks")) {
        await changeTask(item.id, { ownerId: String(actor.id) });
      } else {
        await changeColumnValue(TASKS.BOARD_ID, item.id, TASKS.COLUMNS.OWNER, { item_ids: [Number(actor.id)] });
      }
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

    // Fully protected, for every viewer including each other: a Super
    // Admin account's status never changes through this page.
    const target = await getAccountState(id);

    if (target && isSuperAdminEmail(target.email)) {
      return res.status(403).json({ error: "This account's status can't be changed here." });
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

      if (isDatabaseBoard("users")) {
        await setUserValues(id, { [USERS.COLUMNS.ACCOUNT_STATUS]: { label: status } });
      } else {
        await changeColumnValue(USERS.BOARD_ID, id, USERS.COLUMNS.ACCOUNT_STATUS, { label: status });
      }
      // Loads an account registered since startup, so e.g. a just-approved
      // user is mentionable straight away rather than after their first login.
      await getAccountState(id);
      applyAccountChange(id, { accountStatus: status });
      clearCache(HANDOVER_BOARDS);

      if (target?.accountStatus === ACCOUNT_STATUS.PENDING && status === ACCOUNT_STATUS.ACTIVE) {
        sendAccountApprovedEmail({ userId: id, email: target.email, firstName: target.firstName, lastName: target.lastName, actor });
      }

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

  // Permanent - deletes the Monday item and the database row (when the
  // Users board is database-backed) right away, not through the nightly
  // sync. Restricted to one account (canDeleteUsers), narrower than
  // requireAdmin/Super Admin. Any open cases/tasks are handed to the actor
  // first, same as Suspend/Archive.
  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const actor = actorOf(req);

    if (!ITEM_ID_PATTERN.test(id)) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    const actorState = await getAccountState(actor.id);

    if (!canDeleteUsers(actorState?.email)) {
      return res.status(403).json({ error: "You can't delete accounts." });
    }

    if (String(id) === String(actor.id)) {
      return res.status(400).json({ error: "You can't delete your own account." });
    }

    const target = await getAccountState(id);

    if (target && isSuperAdminEmail(target.email)) {
      return res.status(403).json({ error: "This account can't be deleted." });
    }

    try {
      const userName = (await getItemName(id)) || `user ${id}`;
      const handOver = await handOverOpenWork(id, userName, actor);

      if (handOver.failed.length > 0) {
        clearCache(HANDOVER_BOARDS);
        return res.status(502).json({
          error: `Couldn't reassign ${handOver.failed.join(", ")}. The account was not deleted - try again.`,
          reassigned: handOver.moved,
        });
      }

      await deleteItemOnMonday(id);

      if (isDatabaseBoard("users")) {
        await deleteUser(id);
      }

      removeAccount(id);
      clearCache(HANDOVER_BOARDS);

      const handOverText = handOver.moved.cases || handOver.moved.tasks
        ? `; reassigned ${handOver.moved.cases} case(s) and ${handOver.moved.tasks} task(s) to ${actor.name}`
        : "";

      logActivity({
        actorId: actor.id,
        actorName: actor.name,
        boardId: USERS.BOARD_ID,
        boardName: resolveBoardName(USERS.BOARD_ID),
        itemId: id,
        itemName: userName,
        actionType: "Deleted",
        description: `${actor.name} permanently deleted ${userName}'s account${handOverText}`,
      });

      res.json({ ok: true, reassigned: handOver.moved });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete the account." });
    }
  });

  // Users page > per-row actions > Send Test Email. Awaited (unlike the
  // registration/approval sends) so the admin who triggered it learns right
  // away whether Mailgun actually accepted it.
  app.post("/api/admin/users/:id/send-test-email", requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const actor = actorOf(req);

    if (!ITEM_ID_PATTERN.test(id)) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    const target = await getAccountState(id);

    if (!target?.email) {
      return res.status(404).json({ error: "This user has no email on file." });
    }

    try {
      const { status, error } = await sendTestEmail({
        userId: id,
        email: target.email,
        firstName: target.firstName,
        lastName: target.lastName,
        actor,
      });

      if (status !== "sent") {
        return res.status(502).json({ error: error || "Mailgun isn't configured on this server." });
      }

      res.json({ ok: true, email: target.email });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to send the test email." });
    }
  });
}
