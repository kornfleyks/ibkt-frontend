import { TASKS } from "../../src/constants/boards/tasks.js";
import { query, ident } from "./db.js";
import { boardFields, createItem, updateItem } from "./boardStore.js";

// The Tasks board in the database ("tasks" in DATABASE_BOARDS). Tasks are
// returned in the app's shape (as src/services/mappers/TaskMapper.js makes
// from Monday), with the owner's, cat's and application's names from their
// tables.

const TABLE = "tasks";
const COLUMNS = TASKS.COLUMNS;

// App field -> Tasks board column.
export const TASK_COLUMNS = {
  title: COLUMNS.TASK,
  status: COLUMNS.STATUS,
  priority: COLUMNS.PRIORITY,
  dueDate: COLUMNS.DUE_DATE,
  ownerId: COLUMNS.OWNER,
  linkedCatId: COLUMNS.LINKED_CAT,
  linkedApplicationId: COLUMNS.LINKED_ADOPTION,
  waitingReason: COLUMNS.WAITING_REASON,
  description: COLUMNS.TASK_DESCRIPTION,
};

async function columns() {
  const { field, table } = await boardFields(TABLE);
  const names = Object.fromEntries(Object.entries(TASK_COLUMNS).map(([key, columnId]) => [key, field(columnId)]));

  return { table, names };
}

function selectTasks({ table, names }) {
  const c = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, `t.${ident(name)}`]));

  return `select t.monday_item_id, t.name, t.monday_created_at, ${c.title} as title, ${c.status} as status, ${c.priority} as priority,
            ${c.dueDate} as due_date, ${c.ownerId} as owner, ${c.linkedCatId} as cat,
            ${c.linkedApplicationId} as application,
            ${c.waitingReason} as waiting_reason, ${c.description} as description,
            (select u.name from users u where u.monday_item_id = (${c.ownerId})[1]) as owner_name,
            (select k.name from cats k where k.monday_item_id = (${c.linkedCatId})[1]) as cat_name,
            (select a.name from applications a where a.monday_item_id = (${c.linkedApplicationId})[1]) as application_name
          from ${ident(table)} t`;
}

function toTask(row) {
  const ownerId = row.owner?.[0] ?? null;
  const catId = row.cat?.[0] ?? null;
  const applicationId = row.application?.[0] ?? null;

  return {
    id: String(row.monday_item_id),
    itemName: row.name ?? "",
    createdAt: row.monday_created_at,
    title: row.title?.length ? row.title.join(", ") : "N/A",
    status: row.status || "N/A",
    priority: row.priority || "N/A",
    dueDate: row.due_date ?? null,
    ownerId: ownerId === null ? null : String(ownerId),
    ownerName: ownerId === null ? "Unassigned" : row.owner_name || "Unassigned",
    linkedCatId: catId === null ? null : String(catId),
    linkedCatName: row.cat_name ?? "",
    linkedApplicationId: applicationId === null ? null : String(applicationId),
    linkedApplicationName: row.application_name ?? "",
    waitingReason: row.waiting_reason ?? "",
    description: row.description ?? "",
  };
}

export async function listTasks() {
  const { rows } = await query(`${selectTasks(await columns())} order by t.monday_item_id`);

  return rows.map(toTask);
}

export async function getTask(id) {
  const { rows } = await query(`${selectTasks(await columns())} where t.monday_item_id = $1`, [Number(id)]);

  return rows[0] ? toTask(rows[0]) : null;
}

// The Task (title) dropdown's labels, in Monday's order.
export async function titleOptions() {
  const { rows } = await query(
    "select label from column_options where board_id = $1 and column_id = $2 order by position nulls last, label",
    [TASKS.BOARD_ID, COLUMNS.TASK],
  );

  return rows.map((row) => row.label);
}

// A title typed for the first time joins the list at once (Monday adds the
// label at the nightly sync; re-reading Monday's columns replaces these).
async function rememberTitle(title) {
  await query(
    `insert into column_options (board_id, column_id, option_key, label, position)
     select $1, $2, 'app:' || $3, $3, coalesce(max(position), 0) + 1 from column_options where board_id = $1 and column_id = $2
     on conflict do nothing`,
    [TASKS.BOARD_ID, COLUMNS.TASK, title],
  );
}

export async function exists(table, id) {
  const { rows } = await query(`select 1 from ${ident(table)} where monday_item_id = $1`, [Number(id)]);

  return rows.length > 0;
}

const RELATION_KEYS = new Set(["ownerId", "linkedCatId", "linkedApplicationId"]);

// { title, status, ... } (app fields) -> the table's fields.
async function toFields(values) {
  const { names } = await columns();
  const fields = {};

  for (const [key, value] of Object.entries(values)) {
    if (key === "title") fields[names.title] = [value];
    else if (RELATION_KEYS.has(key)) fields[names[key]] = value ? [Number(value)] : [];
    else fields[names[key]] = value;
  }

  return fields;
}

// Makes the Monday item at once (1 call), so the task has its lasting id.
export async function insertTask(values) {
  if (values.title) await rememberTitle(values.title);

  const record = await createItem(TABLE, { name: values.title, fields: await toFields(values) });

  return getTask(record.id);
}

export async function changeTask(id, changes) {
  if (changes.title) await rememberTitle(changes.title);

  await updateItem(TABLE, id, { fields: await toFields(changes) });

  return getTask(id);
}
