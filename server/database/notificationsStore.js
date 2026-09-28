import { NOTIFICATIONS } from "../../src/constants/boards/notifications.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/notificationsStatuses.js";
import { query, ident } from "./db.js";
import { boardFields, createLocalItem, updateItem } from "./boardStore.js";

// Notifications kept in the database (the "notifications" board switched on
// in DATABASE_BOARDS): created with no Monday call - the nightly sync makes
// their Monday items. Their id for the app is the record's key, which
// (unlike the temporary database id) never changes; rows that came from
// Monday have no key and keep their Monday id.

const TABLE = "notifications";
const COLUMNS = NOTIFICATIONS.COLUMNS;
const { READ } = NOTIFICATIONS_STATUS_OPTIONS;
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function fields() {
  const { field, extra, table } = await boardFields(TABLE);
  const f = (columnId) => ident(field(columnId));

  return {
    table: ident(table),
    field,
    // The created time's own field (Monday's date column keeps date and time).
    timeField: extra(COLUMNS.CREATED_AT),
    recipient: f(COLUMNS.RECIPIENT_ID),
    read: f(COLUMNS.READ),
    createdAt: f(COLUMNS.CREATED_AT),
    createdTime: ident(extra(COLUMNS.CREATED_AT)),
    targetItem: f(COLUMNS.TARGET_ITEM_ID),
    columns: {
      type: f(COLUMNS.TYPE),
      actorName: f(COLUMNS.ACTOR_NAME),
      targetBoardId: f(COLUMNS.TARGET_BOARD_ID),
      targetItemId: f(COLUMNS.TARGET_ITEM_ID),
      targetName: f(COLUMNS.TARGET_NAME),
      link: f(COLUMNS.LINK),
    },
  };
}

function publicId(row) {
  return row.record_uid ?? String(row.monday_item_id);
}

// { id, created_date: "2026-09-28", created_time: "10:15:00", ... } -> the bell's shape.
function toNotification(row) {
  return {
    id: publicId(row),
    message: row.name ?? "",
    type: row.type ?? "",
    read: row.read === READ.READ,
    actorName: row.actorName ?? "",
    targetBoardId: row.targetBoardId ?? "",
    targetItemId: row.targetItemId ?? "",
    targetName: row.targetName ?? "",
    link: row.link ?? "",
    createdAt: row.created_date ? `${row.created_date}T${row.created_time || "00:00:00"}Z` : null,
  };
}

function selectList(f) {
  const named = Object.entries(f.columns).map(([alias, column]) => `${column} as "${alias}"`);

  return `monday_item_id, record_uid, name, ${f.read} as read, ${f.createdAt} as created_date, ${f.createdTime} as created_time, ${named.join(", ")}`;
}

// A new notification; returns it in the bell's shape (for the live push).
export async function insertNotification({ recipientId, recipientName, type, message, actor, target, link, now }) {
  const { field, timeField } = await fields();
  const iso = now.toISOString();

  const record = await createLocalItem(TABLE, {
    name: message,
    fields: {
      [field(COLUMNS.RECIPIENT_ID)]: String(recipientId),
      [field(COLUMNS.RECIPIENT_NAME)]: recipientName,
      [field(COLUMNS.TYPE)]: type,
      [field(COLUMNS.READ)]: READ.UNREAD,
      [field(COLUMNS.ACTOR_ID)]: String(actor.id),
      [field(COLUMNS.ACTOR_NAME)]: actor.name,
      [field(COLUMNS.TARGET_BOARD_ID)]: String(target.boardId ?? ""),
      [field(COLUMNS.TARGET_ITEM_ID)]: String(target.itemId ?? ""),
      [field(COLUMNS.TARGET_NAME)]: target.name ?? "",
      [field(COLUMNS.LINK)]: link ?? "",
      [field(COLUMNS.CREATED_AT)]: iso.slice(0, 10),
      [timeField]: iso.slice(11, 19),
    },
  });

  return { id: record.key, createdAt: `${iso.slice(0, 19)}Z` };
}

// { notifications: [latest `limit`, newest first], unreadCount }
export async function listNotifications(userId, limit) {
  const f = await fields();
  const [{ rows }, { rows: counts }] = await Promise.all([
    query(
      `select ${selectList(f)} from ${f.table} where ${f.recipient} = $1
       order by ${f.createdAt} desc nulls last, ${f.createdTime} desc nulls last, monday_item_id desc limit $2`,
      [String(userId), limit],
    ),
    query(`select count(*)::int as unread from ${f.table} where ${f.recipient} = $1 and ${f.read} is distinct from $2`, [String(userId), READ.READ]),
  ]);

  return { notifications: rows.map(toNotification), unreadCount: counts[0].unread };
}

// The user's own notification by its app id, or null.
async function findOwn(f, userId, id) {
  const byKey = KEY_PATTERN.test(id);

  if (!byKey && !/^-?\d+$/.test(id)) return null;

  const { rows } = await query(
    `select monday_item_id, ${f.read} as read from ${f.table} where ${f.recipient} = $1 and ${byKey ? "record_uid = $2::uuid" : "monday_item_id = $2::bigint"}`,
    [String(userId), id],
  );

  return rows[0] ?? null;
}

export function isNotificationId(id) {
  return KEY_PATTERN.test(id) || /^\d+$/.test(id);
}

async function markRows(f, rows) {
  for (const row of rows) {
    await updateItem(TABLE, row.monday_item_id, { fields: { [f.field(COLUMNS.READ)]: READ.READ } });
  }
}

// False when it isn't the user's.
export async function markNotificationRead(userId, id) {
  const f = await fields();
  const row = await findOwn(f, userId, id);

  if (!row) return false;

  if (row.read !== READ.READ) await markRows(f, [row]);

  return true;
}

export async function markAllNotificationsRead(userId) {
  const f = await fields();
  const { rows } = await query(`select monday_item_id from ${f.table} where ${f.recipient} = $1 and ${f.read} is distinct from $2`, [
    String(userId),
    READ.READ,
  ]);

  await markRows(f, rows);

  return rows.length;
}

// Recipient ids already notified about `targetItemId`.
export async function notifiedRecipientIds(targetItemId) {
  const f = await fields();
  const { rows } = await query(`select distinct ${f.recipient} as recipient from ${f.table} where ${f.targetItem} = $1`, [String(targetItemId)]);

  return new Set(rows.map((row) => row.recipient).filter(Boolean));
}
