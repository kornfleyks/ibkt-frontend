import { NOTIFICATIONS } from "../src/constants/boards/notifications.js";
import { TASKS } from "../src/constants/boards/tasks.js";
import {
  NOTIFICATIONS_STATUS_OPTIONS,
  NOTIFICATIONS_READ_INDEX,
} from "../src/constants/statuses/notificationsStatuses.js";
import { mondayDirectRequest } from "./mondayClient.js";
import { getAccountState } from "./accountState.js";
import { pushToUser } from "./sessionEvents.js";

// In-app notifications: one row per notification on the Notifications
// board, created here when something is assigned to / taken off someone
// or they're @mentioned, and pushed live to their open tabs over the
// session events stream. Only this module touches the board - the generic
// /api/monday proxy refuses it - so people only ever see their own rows.
//
// Only actions that go through this server notify: something assigned
// directly on Monday doesn't (that would need webhooks).

export const NOTIFICATIONS_BOARD_ID = NOTIFICATIONS.BOARD_ID;

const COLUMNS = NOTIFICATIONS.COLUMNS;
const { TYPE, READ } = NOTIFICATIONS_STATUS_OPTIONS;
const ITEM_ID_PATTERN = /^\d+$/;
const RECENT_LIMIT = 30;
const MARK_ALL_CHUNK = 25;

const LIST_COLUMN_IDS = [
  COLUMNS.TYPE,
  COLUMNS.READ,
  COLUMNS.ACTOR_NAME,
  COLUMNS.TARGET_BOARD_ID,
  COLUMNS.TARGET_ITEM_ID,
  COLUMNS.TARGET_NAME,
  COLUMNS.LINK,
  COLUMNS.CREATED_AT,
];

// Writes one at a time: several notifications can fire from one action
// (e.g. a reassignment notifies two people) and Monday rate-limits bursts.
let writeQueue = Promise.resolve();

function enqueueWrite(task) {
  const result = writeQueue.then(task, task);

  writeQueue = result.catch(() => {});

  return result;
}

function parseCreatedAt(rawValue) {
  try {
    const { date, time } = JSON.parse(rawValue || "{}");

    return date ? `${date}T${time || "00:00:00"}Z` : null;
  } catch {
    return null;
  }
}

function mapNotification(item) {
  const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));

  return {
    id: item.id,
    message: item.name,
    type: columns[COLUMNS.TYPE]?.text ?? "",
    read: columns[COLUMNS.READ]?.text === READ.READ,
    actorName: columns[COLUMNS.ACTOR_NAME]?.text ?? "",
    targetBoardId: columns[COLUMNS.TARGET_BOARD_ID]?.text ?? "",
    targetItemId: columns[COLUMNS.TARGET_ITEM_ID]?.text ?? "",
    targetName: columns[COLUMNS.TARGET_NAME]?.text ?? "",
    link: columns[COLUMNS.LINK]?.text ?? "",
    createdAt: parseCreatedAt(columns[COLUMNS.CREATED_AT]?.value),
  };
}

function recipientRule(userId) {
  return { column_id: COLUMNS.RECIPIENT_ID, compare_value: [String(userId)], operator: "any_of" };
}

// Never throws - a notification failing must never fail the action that
// triggered it. Skips the actor themselves and anyone not Active.
export async function createNotification({ recipientId, type, message, actor, target, link }) {
  try {
    if (!recipientId || String(recipientId) === String(actor.id)) {
      return;
    }

    const recipient = await getAccountState(recipientId);

    if (recipient?.accountStatus !== "Active") {
      return;
    }

    const now = new Date().toISOString();
    const recipientName = `${recipient.firstName ?? ""} ${recipient.lastName ?? ""}`.trim();

    const columnValues = {
      [COLUMNS.RECIPIENT_ID]: String(recipientId),
      [COLUMNS.RECIPIENT_NAME]: recipientName,
      [COLUMNS.TYPE]: { label: type },
      [COLUMNS.READ]: { label: READ.UNREAD },
      [COLUMNS.ACTOR_ID]: String(actor.id),
      [COLUMNS.ACTOR_NAME]: actor.name,
      [COLUMNS.TARGET_BOARD_ID]: String(target.boardId ?? ""),
      [COLUMNS.TARGET_ITEM_ID]: String(target.itemId ?? ""),
      [COLUMNS.TARGET_NAME]: target.name ?? "",
      [COLUMNS.LINK]: link ?? "",
      [COLUMNS.CREATED_AT]: { date: now.slice(0, 10), time: now.slice(11, 19) },
    };

    const data = await enqueueWrite(() =>
      mondayDirectRequest(
        `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
          create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) { id }
        }`,
        {
          boardId: NOTIFICATIONS_BOARD_ID,
          itemName: message.slice(0, 255),
          columnValues: JSON.stringify(columnValues),
        },
      ),
    );

    pushToUser(recipientId, "notification", {
      id: data.create_item.id,
      message: message.slice(0, 255),
      type,
      read: false,
      actorName: actor.name,
      targetBoardId: String(target.boardId ?? ""),
      targetItemId: String(target.itemId ?? ""),
      targetName: target.name ?? "",
      link: link ?? "",
      createdAt: `${now.slice(0, 19)}Z`,
    });
  } catch (err) {
    console.error("Notifications: failed to create notification.", err.message);
  }
}

const ASSIGNMENT_TEXT = {
  task: {
    assignedType: TYPE.TASK_ASSIGNED,
    unassignedType: TYPE.TASK_UNASSIGNED,
    assigned: (actor, name) => `${actor} assigned you a task: ${name}`,
    unassigned: (actor, name) => `${actor} took you off the task: ${name}`,
  },
  case: {
    assignedType: TYPE.CASE_ASSIGNED,
    unassignedType: TYPE.CASE_UNASSIGNED,
    assigned: (actor, name) => `${actor} assigned you the case: ${name}`,
    unassigned: (actor, name) => `${actor} took you off the case: ${name}`,
  },
};

// Owner went from `previousIds` to `nextIds`: everyone added is told they
// were assigned, everyone removed that it was taken off them.
export function notifyAssignmentChange({ kind, previousIds = [], nextIds = [], actor, target, link }) {
  const text = ASSIGNMENT_TEXT[kind];
  const previous = new Set(previousIds.map(String));
  const next = new Set(nextIds.map(String));

  for (const id of next) {
    if (!previous.has(id)) {
      createNotification({ recipientId: id, type: text.assignedType, message: text.assigned(actor.name, target.name), actor, target, link });
    }
  }

  for (const id of previous) {
    if (!next.has(id)) {
      createNotification({ recipientId: id, type: text.unassignedType, message: text.unassigned(actor.name, target.name), actor, target, link });
    }
  }
}

export function notifyMentions({ mentionIds, actor, target, link }) {
  for (const id of new Set(mentionIds.map(String))) {
    createNotification({
      recipientId: id,
      type: TYPE.MENTION,
      message: `${actor.name} mentioned you on ${target.name}`,
      actor,
      target,
      link,
    });
  }
}

function parseJson(value) {
  if (value && typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function linkedIds(value) {
  return (parseJson(value)?.item_ids ?? []).map(String);
}

function taskLink(catId) {
  return catId ? `/cats/${catId}?tab=tasks` : "/tasks";
}

async function readTaskCatId(taskId) {
  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) { column_values(ids: $columnIds) { ... on BoardRelationValue { linked_item_ids } } }
    }`,
    { ids: [taskId], columnIds: [TASKS.COLUMNS.LINKED_CAT] },
  );

  return data.items?.[0]?.column_values?.[0]?.linked_item_ids?.[0] ?? null;
}

// Hook for successful /api/monday mutations: a task created with an owner,
// or a task's Owner changed. Fire-and-forget, never throws.
export async function notifyFromTaskMutation({ kind, variables, result, actor, priorSnapshot }) {
  try {
    if (String(variables?.boardId) !== TASKS.BOARD_ID) {
      return;
    }

    if (kind === "createItem") {
      const columnValues = parseJson(variables.columnValues) ?? {};
      const ownerIds = linkedIds(columnValues[TASKS.COLUMNS.OWNER]);

      if (ownerIds.length === 0) {
        return;
      }

      const catId = linkedIds(columnValues[TASKS.COLUMNS.LINKED_CAT])[0] ?? null;

      notifyAssignmentChange({
        kind: "task",
        nextIds: ownerIds,
        actor,
        target: { boardId: TASKS.BOARD_ID, itemId: result.data?.create_item?.id ?? "", name: variables.itemName },
        link: taskLink(catId),
      });
      return;
    }

    if (kind === "changeColumnValue" && variables.columnId === TASKS.COLUMNS.OWNER) {
      notifyAssignmentChange({
        kind: "task",
        previousIds: priorSnapshot?.linkedIds ?? [],
        nextIds: linkedIds(variables.value),
        actor,
        target: { boardId: TASKS.BOARD_ID, itemId: variables.itemId, name: priorSnapshot?.itemName || "a task" },
        link: taskLink(await readTaskCatId(variables.itemId)),
      });
    }
  } catch (err) {
    console.error("Notifications: failed to process task change.", err.message);
  }
}

async function listNotifications(userId) {
  const data = await mondayDirectRequest(
    `query ($boardId: ID!, $columnIds: [String!], $recent: ItemsQuery, $unread: ItemsQuery) {
      boards(ids: [$boardId]) {
        recent: items_page(limit: ${RECENT_LIMIT}, query_params: $recent) {
          items { id name column_values(ids: $columnIds) { id text value } }
        }
        unread: items_page(limit: 500, query_params: $unread) {
          items { id }
        }
      }
    }`,
    {
      boardId: NOTIFICATIONS_BOARD_ID,
      columnIds: LIST_COLUMN_IDS,
      recent: {
        rules: [recipientRule(userId)],
        order_by: [{ column_id: COLUMNS.CREATED_AT, direction: "desc" }],
      },
      // Status filters match on the label index, not its text.
      unread: {
        rules: [
          recipientRule(userId),
          { column_id: COLUMNS.READ, compare_value: [NOTIFICATIONS_READ_INDEX.UNREAD], operator: "any_of" },
        ],
      },
    },
  );

  const board = data.boards[0];

  return {
    notifications: board.recent.items.map(mapNotification),
    unreadCount: board.unread.items.length,
  };
}

async function markRead(notificationIds) {
  for (let start = 0; start < notificationIds.length; start += MARK_ALL_CHUNK) {
    const chunk = notificationIds.slice(start, start + MARK_ALL_CHUNK);

    // Ids are validated as digits, so building the aliases inline is safe.
    const mutation = `mutation ($boardId: ID!, $columnId: String!, $value: JSON!) {
      ${chunk
        .map((id, index) => `n${index}: change_column_value(board_id: $boardId, item_id: ${id}, column_id: $columnId, value: $value) { id }`)
        .join("\n")}
    }`;

    await enqueueWrite(() =>
      mondayDirectRequest(mutation, {
        boardId: NOTIFICATIONS_BOARD_ID,
        columnId: COLUMNS.READ,
        value: JSON.stringify({ label: READ.READ }),
      }),
    );
  }
}

// Only the recipient may mark a notification read.
async function isOwnNotification(userId, notificationId) {
  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) { board { id } column_values(ids: $columnIds) { text } }
    }`,
    { ids: [notificationId], columnIds: [COLUMNS.RECIPIENT_ID] },
  );

  const item = data.items?.[0];

  return (
    String(item?.board?.id) === NOTIFICATIONS_BOARD_ID &&
    item?.column_values?.[0]?.text === String(userId)
  );
}

export function registerNotificationRoutes(app, { requireAuth }) {
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      res.json(await listNotifications(req.user.sub));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load notifications." });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const { id } = req.params;

    if (!ITEM_ID_PATTERN.test(id)) {
      return res.status(400).json({ error: "Invalid notification id." });
    }

    try {
      if (!(await isOwnNotification(req.user.sub, id))) {
        return res.status(404).json({ error: "Notification not found." });
      }

      await markRead([id]);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update the notification." });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const data = await mondayDirectRequest(
        `query ($boardId: ID!, $unread: ItemsQuery) {
          boards(ids: [$boardId]) { items_page(limit: 500, query_params: $unread) { items { id } } }
        }`,
        {
          boardId: NOTIFICATIONS_BOARD_ID,
          unread: {
            rules: [
              recipientRule(req.user.sub),
              { column_id: COLUMNS.READ, compare_value: [NOTIFICATIONS_READ_INDEX.UNREAD], operator: "any_of" },
            ],
          },
        },
      );

      const ids = data.boards[0].items_page.items.map((item) => item.id);

      await markRead(ids);
      res.json({ marked: ids.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update notifications." });
    }
  });
}
