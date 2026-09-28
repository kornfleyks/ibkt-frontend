import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Connection to the Supabase Postgres database that shadows Monday during
// the trial (see mirror.js). Optional: without DATABASE_URL the app runs
// exactly as before and nothing here is used.
//
// Every query is counted per UTC day (the same day as Monday's limit) for the
// Database Requests counter; the count is kept in a small local file so it
// survives restarts, like the Monday count (see ../mondayUsage.js).

// Dates (type 1082) as plain "YYYY-MM-DD" strings: node-postgres would
// otherwise make them local-time Date objects and shift the day.
pg.types.setTypeParser(1082, (value) => value);

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
const USAGE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".database-usage.json");
const SAVE_DELAY_MS = 1_000;

let counter = loadCounter();
let saveTimer = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadCounter() {
  try {
    const stored = JSON.parse(fs.readFileSync(USAGE_FILE, "utf8"));

    if (stored.day === today() && Number.isInteger(stored.queries)) {
      return stored;
    }
  } catch {
    // No file yet, or unreadable - start from zero.
  }

  return { day: today(), queries: 0 };
}

function saveCounter() {
  saveTimer = null;

  fs.writeFile(USAGE_FILE, JSON.stringify(counter), (err) => {
    if (err) {
      console.error("Database: failed to save the request counter.", err.message);
    }
  });
}

export function isDatabaseEnabled() {
  return Boolean(DATABASE_URL);
}

function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      // Supabase requires TLS; its pooler certificate isn't in Node's store.
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });

    pool.on("error", (err) => console.error("Database: idle connection error.", err.message));
  }

  return pool;
}

function countQuery() {
  if (counter.day !== today()) {
    counter = { day: today(), queries: 0 };
  }

  counter.queries += 1;

  if (!saveTimer) {
    saveTimer = setTimeout(saveCounter, SAVE_DELAY_MS);
    saveTimer.unref();
  }
}

export async function query(text, params = []) {
  if (!isDatabaseEnabled()) {
    throw new Error("DATABASE_URL is not set.");
  }

  countQuery();

  return getPool().query(text, params);
}

// Runs `work(run)` in one transaction on one connection; `run(text, params)`
// is `query` bound to it. Rolls back if `work` throws.
export async function transaction(work) {
  if (!isDatabaseEnabled()) {
    throw new Error("DATABASE_URL is not set.");
  }

  const client = await getPool().connect();
  const run = (text, params = []) => {
    countQuery();
    return client.query(text, params);
  };

  try {
    await run("begin");
    const result = await work(run);
    await run("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Closes the pool (for one-off scripts).
export async function closeDatabase() {
  await pool?.end();
  pool = null;
}

// Queries sent today (UTC) by this server.
export function getQueryCount() {
  return counter.day === today() ? counter.queries : 0;
}

// Postgres identifier quoting, for the generated table/column names.
export function ident(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}
