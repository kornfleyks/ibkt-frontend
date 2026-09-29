import { query, ident } from "./db.js";
import { SECRET_COLUMN_IDS } from "./mondaySchema.js";

// GET /api/admin/database-tables/:table/rows?limit=50&offset=0 (Admin):
// a page of one table's rows, for the Database card on App Settings.
// Development only: local and Render share the database, so the check is
// this server's APP_ENV, and anywhere else the route answers 404.
//
// Secret columns never leave the server: the Users password hash and
// login / reset tokens (SECRET_COLUMN_IDS, with their companion columns),
// plus any column whose name looks like a password, token or secret.
// Rows come newest first (primary key descending); long values are cut.

const PAGE_DEFAULT = 50;
const PAGE_MAX = 100;
const VALUE_MAX_CHARS = 500;
const SECRET_NAME = /password|token|secret/i;

export function isDevelopmentServer() {
  return process.env.APP_ENV === "development";
}

async function publicTableExists(table) {
  const { rows } = await query("select 1 from pg_stat_user_tables where schemaname = 'public' and relname = $1", [table]);

  return rows.length > 0;
}

async function hiddenColumnNames(table) {
  const { rows } = await query("select column_name, extra_column from monday_columns where table_name = $1 and column_id = any($2::text[])", [
    table,
    [...SECRET_COLUMN_IDS],
  ]);

  return new Set(rows.flatMap((row) => [row.column_name, row.extra_column].filter(Boolean)));
}

async function primaryKeyColumns(table) {
  const { rows } = await query(
    `select a.attname as name from pg_index i
     join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = $1::regclass and i.indisprimary`,
    [`public.${ident(table)}`],
  );

  return rows.map((row) => row.name);
}

function shownValue(value) {
  if (value === null || value === undefined) return null;

  const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);

  return text.length > VALUE_MAX_CHARS ? `${text.slice(0, VALUE_MAX_CHARS)}...` : text;
}

export async function readTableRows(table, { limit = PAGE_DEFAULT, offset = 0 } = {}) {
  if (!(await publicTableExists(table))) return null;

  const [{ rows: columns }, hidden, primaryKey] = await Promise.all([
    query("select column_name as name, data_type as type from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position", [
      table,
    ]),
    hiddenColumnNames(table),
    primaryKeyColumns(table),
  ]);
  const isHidden = (name) => hidden.has(name) || SECRET_NAME.test(name);
  const shown = columns.filter((column) => !isHidden(column.name));
  const order = primaryKey.length ? `order by ${primaryKey.map((name) => `${ident(name)} desc`).join(", ")}` : "";
  const [{ rows }, { rows: count }] = await Promise.all([
    query(`select ${shown.map((column) => ident(column.name)).join(", ")} from ${ident(table)} ${order} limit $1 offset $2`, [limit, offset]),
    query(`select count(*)::bigint as total from ${ident(table)}`),
  ]);

  return {
    table,
    columns: shown,
    hiddenColumns: columns.filter((column) => isHidden(column.name)).map((column) => column.name),
    rows: rows.map((row) => shown.map((column) => shownValue(row[column.name]))),
    total: Number(count[0].total),
    limit,
    offset,
  };
}

function pageNumber(value, fallback, max) {
  const number = Number.parseInt(value, 10);

  return Number.isInteger(number) && number >= 0 ? Math.min(number, max) : fallback;
}

export function registerTableRowsRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/admin/database-tables/:table/rows", requireAuth, requireAdmin, async (req, res) => {
    if (!isDevelopmentServer()) return res.status(404).end();

    try {
      const page = await readTableRows(req.params.table, {
        limit: pageNumber(req.query.limit, PAGE_DEFAULT, PAGE_MAX) || PAGE_DEFAULT,
        offset: pageNumber(req.query.offset, 0, Number.MAX_SAFE_INTEGER),
      });

      if (!page) return res.status(404).json({ error: "Unknown table." });

      res.json(page);
    } catch (err) {
      console.error(`Table rows (${req.params.table}) failed.`, err);
      res.status(500).json({ error: "Failed to read the table." });
    }
  });
}
