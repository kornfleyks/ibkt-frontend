// Creates / updates the database tables that hold the Monday boards: one
// table per board, one column per Monday column plus companion columns for
// detail Monday needs back (see database/mondaySchema.js), the options of
// status/dropdown columns, and the outbox of changes waiting for Monday.
//
// Monday's column list is read once (1 call) and saved to server/.cache,
// so re-running - e.g. after a database error - costs no Monday call. Pass
// --refresh to read Monday again (after adding or renaming Monday columns).
// Safe to re-run: existing tables and column names are kept.
//
//   node scripts/databaseSchema.js [--refresh]
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mondayDirectRequest } from "../mondayClient.js";
import { ident, transaction, closeDatabase } from "../database/db.js";
import {
  MIRRORED_BOARDS,
  EXCLUDED_COLUMN_IDS,
  SYSTEM_COLUMNS,
  OPTION_TYPES,
  columnNameFor,
  specFor,
  parseColumnOptions,
  DB_ID_COLUMN_TITLE,
} from "../database/mondaySchema.js";

const CACHE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".cache", "monday-columns.json");

async function mondayColumns() {
  if (!process.argv.includes("--refresh") && fs.existsSync(CACHE_FILE)) {
    console.log(`Using Monday's column list saved at ${path.relative(process.cwd(), CACHE_FILE)} (no Monday call).`);
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  }

  const data = await mondayDirectRequest(
    `query ($ids: [ID!]) { boards(ids: $ids) { id name columns { id title type settings_str } } }`,
    { ids: MIRRORED_BOARDS.map((board) => board.boardId) },
  );

  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data.boards, null, 2));
  console.log("Read Monday's column list (1 Monday call) and saved it for re-runs.");

  return data.boards;
}

function settingsOf(settingsStr) {
  try {
    return settingsStr ? JSON.parse(settingsStr) : null;
  } catch {
    return null;
  }
}

// How an existing column is converted when its type changes.
function usingClause(column, fromType, toSql) {
  if (fromType === "timestamp with time zone" && toSql === "date") {
    return `(${ident(column)} at time zone 'UTC')::date`;
  }

  return `${ident(column)}::${toSql}`;
}

const SQL_TYPE_NAMES = {
  text: "text",
  "text[]": "ARRAY",
  "bigint[]": "ARRAY",
  date: "date",
  time: "time without time zone",
  timestamptz: "timestamp with time zone",
  numeric: "numeric",
  boolean: "boolean",
  bigint: "bigint",
  jsonb: "jsonb",
};

const boards = await mondayColumns();
const boardsById = Object.fromEntries(boards.map((board) => [String(board.id), board]));
const summary = [];

await transaction(async (run) => {
  await run(`create table if not exists monday_columns (
    board_id text not null,
    column_id text not null,
    table_name text not null,
    column_name text not null,
    monday_type text not null,
    sql_type text not null,
    primary key (board_id, column_id)
  )`);
  await run("alter table monday_columns add column if not exists extra_column text");
  // Monday's column settings (e.g. whether a link column allows several items).
  await run("alter table monday_columns add column if not exists settings jsonb");

  await run(`create table if not exists column_options (
    board_id text not null,
    column_id text not null,
    option_key text not null,
    label text not null,
    color text,
    position integer,
    primary key (board_id, column_id, option_key)
  )`);

  // Changes waiting to be sent to Monday (the nightly sync, Phase 2).
  // Written in the same transaction as the change itself.
  await run(`create table if not exists monday_outbox (
    id bigserial primary key,
    created_at timestamptz not null default now(),
    board_id text not null,
    monday_item_id bigint,
    action text not null check (action in ('create', 'update', 'delete', 'create_update')),
    changes jsonb not null default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
    attempts integer not null default 0,
    last_error text,
    sent_at timestamptz
  )`);
  await run("create index if not exists monday_outbox_pending on monday_outbox (status, id)");
  // 'sending': a Monday item being created by the sync (database-first
  // records, Phase 3) - if the run is cut off, the next one looks the item
  // up by its DB ID before trying again, so it's never made twice.
  await run("alter table monday_outbox drop constraint if exists monday_outbox_status_check");
  await run("alter table monday_outbox add constraint monday_outbox_status_check check (status in ('pending', 'sending', 'sent', 'failed'))");

  // Records made in the database before their Monday item exists get a
  // temporary negative id from here, replaced by the Monday id at the sync.
  await run("create sequence if not exists local_item_ids");

  // Nightly sync bookkeeping (Phase 2, database/sync.js).
  await run(`create table if not exists sync_runs (
    id bigserial primary key,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    reason text,
    status text not null default 'running' check (status in ('running', 'done', 'partial', 'failed')),
    sent integer not null default 0,
    failed integer not null default 0,
    monday_calls integer not null default 0,
    error text
  )`);

  // One sync at a time across servers (local and Render share this database).
  await run(`create table if not exists sync_lock (
    id integer primary key default 1 check (id = 1),
    holder text,
    expires_at timestamptz not null default now()
  )`);

  // Records being created: noted before their Monday item exists, so a
  // crash between "created in Monday" and "saved here" can be recovered
  // (the item is found by its DB ID) instead of creating a duplicate.
  await run(`create table if not exists pending_creations (
    key uuid primary key,
    board_id text not null,
    table_name text not null,
    name text not null,
    fields jsonb not null default '{}'::jsonb,
    monday_item_id bigint,
    status text not null default 'pending' check (status in ('pending', 'done', 'abandoned')),
    created_at timestamptz not null default now()
  )`);

  // Each board's "DB ID" Monday column (added by scripts/createDbIdColumns.js).
  await run(`create table if not exists monday_sync_columns (
    board_id text primary key,
    db_id_column text not null
  )`);

  await run(`create table if not exists communications (
    monday_update_id bigint primary key,
    board_id text not null,
    monday_item_id bigint not null,
    author text,
    role text,
    body text,
    monday_created_at timestamptz,
    mirrored_at timestamptz not null default now()
  )`);
  await run("create index if not exists communications_item on communications (monday_item_id)");

  const existing = (await run("select board_id, column_id, column_name, extra_column from monday_columns")).rows;
  const existingTypes = new Map(
    (await run(`select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'`)).rows.map(
      (row) => [`${row.table_name}.${row.column_name}`, row.data_type],
    ),
  );

  for (const { boardId, table } of MIRRORED_BOARDS) {
    const board = boardsById[boardId];

    if (!board) {
      console.warn(`Board ${boardId} (${table}) not found on Monday - skipped.`);
      continue;
    }

    await run(`create table if not exists ${ident(table)} (
      monday_item_id bigint primary key,
      name text,
      monday_created_at timestamptz,
      updated_at timestamptz not null default now(),
      mirrored_at timestamptz
    )`);
    // The key given to records created through the app (pending_creations,
    // Monday's "DB ID" column); empty for items that came from Monday.
    await run(`alter table ${ident(table)} add column if not exists record_uid uuid`);

    const known = new Map(existing.filter((row) => row.board_id === boardId).map((row) => [row.column_id, row]));
    const used = new Set([...SYSTEM_COLUMNS, ...[...known.values()].flatMap((row) => [row.column_name, row.extra_column]).filter(Boolean)]);
    const uniqueName = (base) => {
      let name = base;

      for (let n = 2; used.has(name); n += 1) {
        name = `${base}_${n}`;
      }

      used.add(name);
      return name;
    };

    let added = 0;
    let converted = 0;
    let options = 0;

    for (const column of board.columns) {
      const spec = specFor(column.type);

      // "DB ID" is the sync's own bookkeeping column on Monday, not data.
      if (column.id === "name" || !spec.sql || EXCLUDED_COLUMN_IDS.has(column.id) || column.title === DB_ID_COLUMN_TITLE) {
        continue;
      }

      const previous = known.get(column.id);
      const name = previous?.column_name ?? uniqueName(columnNameFor(column.title));
      const currentType = existingTypes.get(`${table}.${name}`);

      if (!previous) added += 1;

      if (!currentType) {
        await run(`alter table ${ident(table)} add column ${ident(name)} ${spec.sql}`);
      } else if (currentType !== SQL_TYPE_NAMES[spec.sql]) {
        await run(`alter table ${ident(table)} alter column ${ident(name)} type ${spec.sql} using ${usingClause(name, currentType, spec.sql)}`);
        converted += 1;
      }

      let extraColumn = null;

      if (spec.extra) {
        extraColumn = previous?.extra_column ?? uniqueName(`${name}_${spec.extra.suffix}`);
        await run(`alter table ${ident(table)} add column if not exists ${ident(extraColumn)} ${spec.extra.sql}`);
      }

      await run(
        `insert into monday_columns (board_id, column_id, table_name, column_name, monday_type, sql_type, extra_column, settings)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (board_id, column_id) do update
           set table_name = excluded.table_name, monday_type = excluded.monday_type,
               sql_type = excluded.sql_type, extra_column = excluded.extra_column, settings = excluded.settings`,
        [boardId, column.id, table, name, column.type, spec.sql, extraColumn, settingsOf(column.settings_str)],
      );

      if (OPTION_TYPES.has(column.type)) {
        await run("delete from column_options where board_id = $1 and column_id = $2", [boardId, column.id]);

        for (const option of parseColumnOptions(column.type, column.settings_str)) {
          await run(
            `insert into column_options (board_id, column_id, option_key, label, color, position) values ($1, $2, $3, $4, $5, $6)`,
            [boardId, column.id, option.key, option.label, option.color, option.position],
          );
          options += 1;
        }
      }
    }

    summary.push(`${table.padEnd(14)} ${String(board.columns.length).padStart(3)} Monday columns, ${added} new, ${converted} converted, ${options} options`);
  }

  // Reachable only by this server's connection; Supabase's public API
  // (anon / authenticated keys) gets nothing without policies.
  for (const table of ["monday_columns", "column_options", "monday_outbox", "sync_runs", "sync_lock", "pending_creations", "monday_sync_columns", "communications", ...MIRRORED_BOARDS.map((board) => board.table)]) {
    await run(`alter table if exists ${ident(table)} enable row level security`);
  }
});

console.log(summary.join("\n"));
await closeDatabase();
