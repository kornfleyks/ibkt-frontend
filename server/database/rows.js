import { query, ident } from "./db.js";

// Writing mirrored Monday data into the tables built by
// scripts/databaseSchema.js. Shared by the backfill and the live mirror.

const AUTHOR_PREFIX = /^\[(.+?) - (.+?)\]\s([\s\S]*)$/;
const ROWS_PER_INSERT = 100;

// boardId -> { table, columns: Map(columnId -> { name, type, extra, options }) },
// from the monday_columns / column_options tables the schema script fills.
// `extra` is the companion column (or null); `options` maps option keys to
// labels for status/dropdown columns.
export async function loadColumnMap(run = query) {
  const [{ rows }, { rows: optionRows }] = await Promise.all([
    run("select board_id, column_id, table_name, column_name, monday_type, extra_column from monday_columns"),
    run("select board_id, column_id, option_key, label from column_options"),
  ]);
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.board_id)) {
      map.set(row.board_id, { table: row.table_name, columns: new Map() });
    }

    map.get(row.board_id).columns.set(row.column_id, {
      name: row.column_name,
      type: row.monday_type,
      extra: row.extra_column ?? null,
      options: new Map(),
    });
  }

  for (const option of optionRows) {
    map.get(option.board_id)?.columns.get(option.column_id)?.options.set(option.option_key, option.label);
  }

  return map;
}

// { main, extra } for one column -> { column_name: value, [extra_column]: value }.
export function columnValues(target, converted) {
  if (!converted) {
    return {};
  }

  return {
    [target.name]: converted.main,
    ...(target.extra && { [target.extra]: converted.extra }),
  };
}

// rows: [{ mondayItemId, name?, createdAt?, values: { column_name: value } }].
// Inserts new items; for existing ones only the given columns change, so a
// single-column update doesn't blank the rest of the row.
export async function upsertItems(table, rows, run = query) {
  // Rows with the same set of columns share one statement.
  const groups = new Map();

  for (const row of rows) {
    const columns = {
      monday_item_id: Number(row.mondayItemId),
      ...(row.name !== undefined && { name: row.name }),
      ...(row.createdAt !== undefined && { monday_created_at: row.createdAt }),
      ...row.values,
    };
    const key = Object.keys(columns).sort().join(",");

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(columns);
  }

  let written = 0;

  for (const group of groups.values()) {
    const names = Object.keys(group[0]);
    const updates = names.filter((name) => name !== "monday_item_id");

    for (let start = 0; start < group.length; start += ROWS_PER_INSERT) {
      const chunk = group.slice(start, start + ROWS_PER_INSERT);
      const params = [];
      const tuples = chunk.map((columns) => {
        const placeholders = names.map((name) => {
          params.push(columns[name]);
          return `$${params.length}`;
        });

        return `(${placeholders.join(", ")}, now())`;
      });

      await run(
        `insert into ${ident(table)} (${names.map(ident).join(", ")}, mirrored_at)
         values ${tuples.join(", ")}
         on conflict (monday_item_id) do update set
           ${[...updates.map((name) => `${ident(name)} = excluded.${ident(name)}`), "updated_at = now()", "mirrored_at = now()"].join(", ")}`,
        params,
      );

      written += chunk.length;
    }
  }

  return written;
}

export async function deleteItem(table, mondayItemId, run = query) {
  await run(`delete from ${ident(table)} where monday_item_id = $1`, [Number(mondayItemId)]);
}

// A Communications message (Monday item update). The app stores the author
// as a "[Name - Role] " prefix of the body; it's split out here.
export async function upsertCommunication({ updateId, boardId, itemId, body, createdAt }, run = query) {
  const match = AUTHOR_PREFIX.exec(body ?? "");

  await run(
    `insert into communications (monday_update_id, board_id, monday_item_id, author, role, body, monday_created_at, mirrored_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (monday_update_id) do update set
       body = excluded.body, author = excluded.author, role = excluded.role, mirrored_at = now()`,
    [Number(updateId), String(boardId), Number(itemId), match?.[1] ?? null, match?.[2] ?? null, match ? match[3] : body ?? null, createdAt ?? null],
  );
}
