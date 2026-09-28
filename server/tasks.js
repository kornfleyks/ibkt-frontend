import { TASKS } from "../src/constants/boards/tasks.js";
import { TASKS_STATUS_OPTIONS } from "../src/constants/statuses/tasksStatuses.js";
import { isDatabaseBoard } from "./database/switches.js";
import { StoreError } from "./database/boardStore.js";
import * as stored from "./database/tasksStore.js";
import { logActivity, resolveColumnLabel } from "./activityLog.js";
import { notifyAssignmentChange } from "./notifications.js";

// Tasks kept in the database ("tasks" in DATABASE_BOARDS; database-first
// plan 4.1). The app switches to these endpoints when the board is on and
// uses Monday otherwise. Same access as before: every signed-in user sees
// and changes every task. What the Monday route did for task changes is
// done here too: Activity Log entries (with old values) and notifications
// for the owners.
//
//   GET  /api/tasks                  all tasks
//   GET  /api/tasks/title-options    the Task dropdown's labels
//   GET  /api/tasks/:id
//   POST /api/tasks                  { catId, title, status, priority, dueDate?, ownerId?, waitingReason?, description }
//   POST /api/tasks/:id              any of { title, status, priority, dueDate, ownerId, waitingReason, description }

const EDITABLE = ["title", "status", "priority", "dueDate", "ownerId", "waitingReason", "description"];
const STATUSES = new Set(Object.values(TASKS_STATUS_OPTIONS.STATUS));
const PRIORITIES = new Set(Object.values(TASKS_STATUS_OPTIONS.PRIORITY));
const ID_PATTERN = /^\d+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

class InputError extends Error {}

function taskLink(catId) {
  return catId ? `/cats/${catId}?tab=tasks` : "/tasks";
}

function actorOf(req) {
  return { id: req.user.sub, name: `${req.user.firstName} ${req.user.lastName}`.trim() };
}

// Checks and tidies the fields sent; only the ones given are returned.
async function cleanFields(body, { creating }) {
  const values = {};

  for (const key of EDITABLE) {
    if (body[key] === undefined) continue;

    const value = body[key];

    switch (key) {
      case "title":
        if (typeof value !== "string" || !value.trim()) throw new InputError("A title is required.");
        values.title = value.trim().slice(0, 255);
        break;
      case "status":
        if (!STATUSES.has(value)) throw new InputError(`Unknown status "${value}".`);
        values.status = value;
        break;
      case "priority":
        if (!PRIORITIES.has(value)) throw new InputError(`Unknown priority "${value}".`);
        values.priority = value;
        break;
      case "dueDate":
        if (value !== null && !(typeof value === "string" && DATE_PATTERN.test(value))) throw new InputError("The due date must be YYYY-MM-DD.");
        values.dueDate = value;
        break;
      case "ownerId":
        if (value !== null && !(ID_PATTERN.test(String(value)) && (await stored.exists("users", value)))) throw new InputError("Unknown owner.");
        values.ownerId = value === null ? null : String(value);
        break;
      default:
        if (typeof value !== "string") throw new InputError(`${key} must be text.`);
        values[key] = value;
    }
  }

  if (creating && !values.title) throw new InputError("A title is required.");

  return values;
}

// A field's value as the Activity Log shows it.
function shown(task, key) {
  if (key === "ownerId") return task.ownerId ? task.ownerName : "(empty)";

  const value = task[key];

  return value === null || value === undefined || value === "" || value === "N/A" ? "(empty)" : String(value);
}

function logChanges(actor, before, after, keys) {
  for (const key of keys) {
    const from = shown(before, key);
    const to = shown(after, key);

    if (from === to) continue;

    const fieldChanged = resolveColumnLabel(TASKS.BOARD_ID, stored.TASK_COLUMNS[key]);

    logActivity({
      actorId: actor.id,
      actorName: actor.name,
      boardId: TASKS.BOARD_ID,
      boardName: "Tasks",
      itemId: after.id,
      itemName: after.itemName,
      actionType: "Updated",
      description: `${actor.name} changed ${fieldChanged} from "${from}" to "${to}" on ${after.itemName}`,
      fieldChanged,
      oldValue: from,
      newValue: to,
      raw: { taskId: after.id, [key]: after[key] },
    });
  }
}

function send(res, work) {
  work
    .then((result) => (result === null ? res.status(404).json({ error: "Task not found." }) : res.json(result)))
    .catch((err) => {
      if (err instanceof InputError) return res.status(400).json({ error: err.message });
      if (err instanceof StoreError) return res.status(err.status).json({ error: err.message });
      if (err.rateLimited) return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });

      console.error("Tasks:", err);
      res.status(500).json({ error: "The task request failed." });
    });
}

export function registerTaskRoutes(app, { requireAuth }) {
  // Only while the board is switched on; otherwise the app uses Monday.
  const onlyInDatabase = (req, res, next) =>
    isDatabaseBoard("tasks") ? next() : res.status(409).json({ error: "Tasks are still kept on Monday on this server." });

  app.get("/api/tasks", requireAuth, onlyInDatabase, (req, res) => send(res, stored.listTasks()));

  app.get("/api/tasks/title-options", requireAuth, onlyInDatabase, (req, res) => send(res, stored.titleOptions()));

  app.get("/api/tasks/:id", requireAuth, onlyInDatabase, (req, res) => {
    if (!ID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Invalid task id." });

    send(res, stored.getTask(req.params.id));
  });

  app.post("/api/tasks", requireAuth, onlyInDatabase, (req, res) => {
    send(
      res,
      (async () => {
        const body = req.body ?? {};

        if (!ID_PATTERN.test(String(body.catId ?? "")) || !(await stored.exists("cats", body.catId))) {
          throw new InputError("Unknown cat.");
        }

        const values = await cleanFields(body, { creating: true });
        const task = await stored.insertTask({ ...values, linkedCatId: String(body.catId) });
        const actor = actorOf(req);

        logActivity({
          actorId: actor.id,
          actorName: actor.name,
          boardId: TASKS.BOARD_ID,
          boardName: "Tasks",
          itemId: task.id,
          itemName: task.itemName,
          actionType: "Created",
          description: `${actor.name} created "${task.itemName}" on Tasks`,
          raw: { ...values, catId: String(body.catId) },
        });

        if (task.ownerId) {
          notifyAssignmentChange({
            kind: "task",
            nextIds: [task.ownerId],
            actor,
            target: { boardId: TASKS.BOARD_ID, itemId: task.id, name: task.itemName },
            link: taskLink(task.linkedCatId),
          });
        }

        return task;
      })(),
    );
  });

  app.post("/api/tasks/:id", requireAuth, onlyInDatabase, (req, res) => {
    if (!ID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Invalid task id." });

    send(
      res,
      (async () => {
        const before = await stored.getTask(req.params.id);

        if (!before) return null;

        const changes = await cleanFields(req.body ?? {}, { creating: false });

        if (!Object.keys(changes).length) throw new InputError("Nothing to change.");

        const after = await stored.changeTask(req.params.id, changes);
        const actor = actorOf(req);

        logChanges(actor, before, after, Object.keys(changes));

        if ("ownerId" in changes && before.ownerId !== after.ownerId) {
          notifyAssignmentChange({
            kind: "task",
            previousIds: before.ownerId ? [before.ownerId] : [],
            nextIds: after.ownerId ? [after.ownerId] : [],
            actor,
            target: { boardId: TASKS.BOARD_ID, itemId: after.id, name: after.itemName || "a task" },
            link: taskLink(after.linkedCatId),
          });
        }

        return after;
      })(),
    );
  });
}
