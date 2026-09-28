import os from "node:os";
import { randomUUID } from "node:crypto";
import { query, transaction, ident } from "./db.js";
import { finishCreation } from "./boardStore.js";
import { SYNC_MARKER } from "./mirror.js";
import { MIRRORED_BOARDS } from "./mondaySchema.js";
import { mondayFetch, mondayRetryAfterSeconds } from "../mondayRateLimit.js";
import { mondayHeaders } from "../mondayApiVersion.js";
import { listActiveAccounts } from "../accountState.js";
import { createNotification } from "../notifications.js";

// The nightly sync (database-first plan, Phase 2): sends the changes queued
// in monday_outbox to Monday.
//
// - Changes go in the order they were made; several changes to one item are
//   merged (latest value of each column wins) into one Monday write, and
//   many items share one Monday request.
// - An entry is marked sent only after Monday confirms it; failures are
//   retried next run, and after MAX_ATTEMPTS it's marked failed and admins
//   are notified.
// - Stops cleanly on Monday's rate limit, and never uses more than
//   SYNC_MAX_CALLS Monday calls per run (default 50); the rest waits.
// - Deleted records are archived in Monday (recoverable for 30 days).
// - One run at a time across servers (sync_lock). Scheduled only where
//   SYNC_ENABLED=true (Render), at SYNC_TIME_UTC (default 00:30, just after
//   Monday's daily allowance resets), plus a catch-up on start if a night
//   was missed. "Run now" (POST /api/admin/sync/run) works anywhere.
// - Also finishes record creations interrupted by a crash (pending_creations).

const OPERATIONS_PER_REQUEST = 20;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const CATCH_UP_DELAY_MS = 2 * 60_000;
const RECOVER_AFTER_MINUTES = 5;
const SYSTEM_ACTOR = { id: "system", name: "IBKT System" };

const holder = `${os.hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

let running = null;
let nextRunAt = null;

function syncEnabled() {
  return process.env.SYNC_ENABLED === "true";
}

function maxCalls() {
  const value = Number(process.env.SYNC_MAX_CALLS);

  return Number.isInteger(value) && value > 0 ? value : 50;
}

function syncTime() {
  const match = /^(\d{1,2}):(\d{2})$/.exec(process.env.SYNC_TIME_UTC ?? "00:30");

  return match ? { hour: Number(match[1]) % 24, minute: Number(match[2]) % 60 } : { hour: 0, minute: 30 };
}

async function acquireLock() {
  const { rows } = await query(
    `insert into sync_lock (id, holder, expires_at) values (1, $1, now() + ($2 || ' minutes')::interval)
     on conflict (id) do update set holder = excluded.holder, expires_at = excluded.expires_at
       where sync_lock.expires_at < now() or sync_lock.holder = excluded.holder
     returning holder`,
    [holder, String(LOCK_MINUTES)],
  );

  return rows[0]?.holder === holder;
}

async function releaseLock() {
  await query("update sync_lock set expires_at = now() where holder = $1", [holder]).catch(() => {});
}

// One Monday request; returns { data, errors } (GraphQL errors don't throw -
// they're matched to operations by alias). Rate limits and network errors throw.
async function mondayCall(queryText, variables, counter) {
  counter.calls += 1;

  const response = await mondayFetch(process.env.MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
    body: JSON.stringify({ query: `${SYNC_MARKER}\n${queryText}`, variables }),
  });

  return response.json();
}

// Monday clears a column when given "" (dbToInput's null means "clear").
function forMonday(columns) {
  return Object.fromEntries(Object.entries(columns ?? {}).map(([id, value]) => [id, value === null ? "" : value]));
}

// Pending outbox entries -> operations, merged per item, in order of the
// first change.
function planOperations(entries) {
  const operations = [];
  const byItem = new Map();

  for (const entry of entries) {
    if (entry.action === "create_update") {
      operations.push({
        kind: "post",
        itemId: entry.monday_item_id,
        body: entry.changes.body,
        localUpdateId: entry.changes.localUpdateId ?? null,
        entryIds: [entry.id],
      });
      continue;
    }

    const key = `${entry.board_id}:${entry.monday_item_id}`;
    let operation = byItem.get(key);

    if (!operation) {
      operation = { kind: "change", boardId: entry.board_id, itemId: entry.monday_item_id, name: undefined, columns: {}, entryIds: [] };
      byItem.set(key, operation);
      operations.push(operation);
    }

    operation.entryIds.push(entry.id);

    // A record made in the database only: its Monday item is created now.
    if (entry.action === "create" && entry.changes.local) {
      operation.kind = "create";
      operation.key = entry.changes.key;
      operation.createEntryId = entry.id;
    }

    if (entry.action === "delete") {
      // Deleted before its Monday item was ever made: nothing to send.
      operation.kind = operation.kind === "create" ? "drop" : "archive";
      operation.columns = {};
      operation.name = undefined;
    } else if (operation.kind !== "archive" && operation.kind !== "drop") {
      if (entry.changes.name !== undefined) operation.name = entry.changes.name;
      Object.assign(operation.columns, entry.changes.columns ?? {});
    }
  }

  return operations;
}

function operationField(operation, index, variables) {
  const alias = `o${index}`;

  if (operation.kind === "archive") {
    variables[`item${index}`] = String(operation.itemId);
    return { alias, declaration: `$item${index}: ID!`, field: `${alias}: archive_item(item_id: $item${index}) { id }` };
  }

  if (operation.kind === "post") {
    variables[`item${index}`] = String(operation.itemId);
    variables[`body${index}`] = String(operation.body ?? "");
    return {
      alias,
      declaration: `$item${index}: ID!, $body${index}: String!`,
      field: `${alias}: create_update(item_id: $item${index}, body: $body${index}) { id }`,
    };
  }

  if (operation.kind === "create") {
    variables[`board${index}`] = String(operation.boardId);
    variables[`name${index}`] = String(operation.name || "Untitled").slice(0, 255);
    // The key in "DB ID" lets a cut-off run find the item instead of making it twice.
    variables[`values${index}`] = JSON.stringify({ ...forMonday(operation.columns), [operation.dbIdColumn]: operation.key });

    return {
      alias,
      declaration: `$board${index}: ID!, $name${index}: String!, $values${index}: JSON`,
      field: `${alias}: create_item(board_id: $board${index}, item_name: $name${index}, column_values: $values${index}, create_labels_if_missing: true) { id }`,
    };
  }

  const values = { ...forMonday(operation.columns), ...(operation.name !== undefined && { name: operation.name }) };

  variables[`board${index}`] = String(operation.boardId);
  variables[`item${index}`] = String(operation.itemId);
  variables[`values${index}`] = JSON.stringify(values);

  return {
    alias,
    declaration: `$board${index}: ID!, $item${index}: ID!, $values${index}: JSON!`,
    field: `${alias}: change_multiple_column_values(board_id: $board${index}, item_id: $item${index}, column_values: $values${index}, create_labels_if_missing: true) { id }`,
  };
}

async function markSent(entryIds) {
  await query("update monday_outbox set status = 'sent', sent_at = now(), last_error = null where id = any($1)", [entryIds]);
}

// Returns how many entries just used up their retries (now 'failed').
async function markFailed(entryIds, error) {
  const { rows } = await query(
    `update monday_outbox set attempts = attempts + 1, last_error = $2,
       status = case when attempts + 1 >= $3 then 'failed' else 'pending' end
     where id = any($1) returning status`,
    [entryIds, String(error).slice(0, 1000), MAX_ATTEMPTS],
  );

  return rows.filter((row) => row.status === "failed").length;
}

function tableOf(boardId) {
  return MIRRORED_BOARDS.find((board) => board.boardId === String(boardId))?.table ?? null;
}

// A database-only record's Monday item exists: its temporary id becomes the
// Monday id - on the row and on any of its changes still queued - and its
// entries are done. One transaction, so the swap is all or nothing.
async function applyCreatedId({ boardId, itemId, entryIds }, mondayId) {
  const table = tableOf(boardId);

  await transaction(async (run) => {
    if (table) {
      await run(`update ${ident(table)} set monday_item_id = $2 where monday_item_id = $1`, [itemId, mondayId]);
    }

    await run("update monday_outbox set monday_item_id = $3 where board_id = $1 and monday_item_id = $2", [boardId, itemId, mondayId]);
    await run("update monday_outbox set status = 'sent', sent_at = now(), last_error = null where id = any($1)", [entryIds]);
  });
}

// Database-only records whose creation was cut off (left 'sending'): Monday
// may or may not have made the item, so look it up by its DB ID first - all
// in one request. Found: take its id. Not found: send it again.
async function recoverSending(counter, dbIdColumns) {
  const { rows } = await query("select * from monday_outbox where status = 'sending' order by id");
  const lookups = rows.filter((row) => dbIdColumns.has(row.board_id) && row.changes?.key);

  if (!lookups.length || counter.calls >= counter.max) return 0;

  const variables = {};
  const fields = lookups.map((row, index) => {
    variables[`board${index}`] = String(row.board_id);
    variables[`key${index}`] = String(row.changes.key);
    return `s${index}: items_page_by_column_values(board_id: $board${index}, limit: 1, columns: [{ column_id: "${dbIdColumns.get(row.board_id)}", column_values: [$key${index}] }]) { items { id } }`;
  });
  const declarations = lookups.map((_, index) => `$board${index}: ID!, $key${index}: String!`).join(", ");
  const result = await mondayCall(`query (${declarations}) { ${fields.join("\n")} }`, variables, counter);

  if (!result.data) return 0;

  let recovered = 0;

  for (const [index, row] of lookups.entries()) {
    const found = result.data[`s${index}`]?.items?.[0]?.id;

    if (found) {
      await applyCreatedId({ boardId: row.board_id, itemId: row.monday_item_id, entryIds: [row.id] }, Number(found));
      recovered += 1;
    } else {
      await query("update monday_outbox set status = 'pending' where id = $1", [row.id]);
    }
  }

  return recovered;
}

// Creations interrupted between "created in Monday" and "saved here".
async function recoverCreations(counter) {
  const { rows } = await query(
    `select p.*, s.db_id_column from pending_creations p left join monday_sync_columns s on s.board_id = p.board_id
     where p.status = 'pending' and p.created_at < now() - ($1 || ' minutes')::interval order by p.created_at`,
    [String(RECOVER_AFTER_MINUTES)],
  );

  if (!rows.length) return { recovered: 0, abandoned: 0 };

  let recovered = 0;
  let abandoned = 0;
  const unknown = rows.filter((row) => !row.monday_item_id && row.db_id_column);

  // Find the Monday items by their DB ID - all in one request.
  if (unknown.length && counter.calls < counter.max) {
    const variables = {};
    const fields = unknown.map((row, index) => {
      variables[`board${index}`] = String(row.board_id);
      variables[`key${index}`] = String(row.key);
      return `p${index}: items_page_by_column_values(board_id: $board${index}, limit: 1, columns: [{ column_id: "${row.db_id_column}", column_values: [$key${index}] }]) { items { id } }`;
    });
    const declarations = unknown.map((_, index) => `$board${index}: ID!, $key${index}: String!`).join(", ");
    const result = await mondayCall(`query (${declarations}) { ${fields.join("\n")} }`, variables, counter);

    unknown.forEach((row, index) => {
      row.monday_item_id = result.data?.[`p${index}`]?.items?.[0]?.id ?? null;
      row.searched = true;
    });
  }

  for (const row of rows) {
    if (row.monday_item_id) {
      await finishCreation(row);
      recovered += 1;
    } else if (row.searched) {
      // Never reached Monday: nothing to recover (the user saw an error).
      await query("update pending_creations set status = 'abandoned' where key = $1", [row.key]);
      abandoned += 1;
    }
  }

  return { recovered, abandoned };
}

function exhaustedMessage(count) {
  return `${count} change${count === 1 ? "" : "s"} couldn't be sent to Monday after ${MAX_ATTEMPTS} tries. See the Sync card on App Settings.`;
}

async function alertAdmins(runId, message) {
  for (const admin of listActiveAccounts().filter((account) => account.role === "Admin")) {
    await createNotification({
      recipientId: admin.id,
      type: "Sync",
      message,
      actor: SYSTEM_ACTOR,
      target: { boardId: "", itemId: `sync-run:${runId}`, name: "Monday sync" },
      link: "/settings",
    });
  }
}

async function run(reason) {
  if (!(await acquireLock())) {
    return { skipped: "Another sync is already running." };
  }

  const counter = { calls: 0, max: maxCalls() };
  const { rows: [runRow] } = await query("insert into sync_runs (reason) values ($1) returning id", [reason]);
  let sent = 0;
  let failed = 0;
  // Entries that used up their retries this run - admins are told once, then.
  let exhausted = 0;
  let stopped = null;

  try {
    await recoverCreations(counter);

    const dbIdColumns = new Map((await query("select board_id, db_id_column from monday_sync_columns")).rows.map((row) => [row.board_id, row.db_id_column]));
    sent += await recoverSending(counter, dbIdColumns);

    const { rows: entries } = await query("select * from monday_outbox where status = 'pending' order by id limit 2000");
    const operations = planOperations(entries);

    for (const operation of operations) {
      if (operation.kind === "create") operation.dbIdColumn = dbIdColumns.get(String(operation.boardId));
    }

    for (let start = 0; start < operations.length; start += OPERATIONS_PER_REQUEST) {
      if (counter.calls >= counter.max) {
        stopped = `Stopped at the ${counter.max}-call limit; the rest waits for the next run.`;
        break;
      }

      const batch = operations.slice(start, start + OPERATIONS_PER_REQUEST);
      // Nothing for Monday to do (e.g. a create with no column values).
      // (A record deleted before its Monday item was made is "drop".)
      const empty = batch.filter(
        (operation) => operation.kind === "drop" || (operation.kind === "change" && operation.name === undefined && !Object.keys(operation.columns).length),
      );
      const real = batch.filter((operation) => !empty.includes(operation));

      if (empty.length) {
        await markSent(empty.flatMap((operation) => operation.entryIds));
        sent += empty.reduce((sum, operation) => sum + operation.entryIds.length, 0);
      }

      if (!real.length) continue;

      const variables = {};
      const parts = real.map((operation, index) => operationField(operation, index, variables));
      const creating = real.filter((operation) => operation.kind === "create").map((operation) => operation.createEntryId);

      // Marked first: if the run dies mid-request, the next one checks
      // Monday for these items before creating them again.
      if (creating.length) {
        await query("update monday_outbox set status = 'sending' where id = any($1)", [creating]);
      }

      let result;

      try {
        result = await mondayCall(`mutation (${parts.map((part) => part.declaration).join(", ")}) { ${parts.map((part) => part.field).join("\n")} }`, variables, counter);
      } catch (err) {
        if (err.rateLimited) {
          // Refused before Monday did anything: safe to send again.
          if (creating.length) await query("update monday_outbox set status = 'pending' where id = any($1)", [creating]);
          stopped = err.message;
          break;
        }

        // Unknown whether Monday made the items: creations stay 'sending'
        // for the DB ID check next run; the rest are retried.
        if (creating.length) {
          await query("update monday_outbox set attempts = attempts + 1, last_error = $2 where id = any($1)", [creating, String(err.message).slice(0, 1000)]);
        }

        for (const operation of real) {
          const retry = operation.kind === "create" ? operation.entryIds.filter((id) => id !== operation.createEntryId) : operation.entryIds;
          if (retry.length) exhausted += await markFailed(retry, err.message);
        }
        failed += real.reduce((sum, operation) => sum + operation.entryIds.length, 0);
        continue;
      }

      const errorsByAlias = new Map();

      for (const error of result.errors ?? []) {
        const alias = error.path?.[0];
        errorsByAlias.set(alias ?? "*", error.message);
      }

      for (const [index, operation] of real.entries()) {
        const alias = parts[index].alias;
        const error = errorsByAlias.get(alias) ?? (result.data?.[alias] ? null : errorsByAlias.get("*") ?? "No answer from Monday.");

        if (error) {
          exhausted += await markFailed(operation.entryIds, error);
          failed += operation.entryIds.length;
        } else if (operation.kind === "create") {
          await applyCreatedId(operation, Number(result.data[alias].id));
          sent += operation.entryIds.length;
        } else if (operation.kind === "post" && operation.localUpdateId) {
          // A message saved in the database first: it now has Monday's id.
          await transaction(async (run) => {
            await run("update communications set monday_update_id = $2 where monday_update_id = $1", [operation.localUpdateId, Number(result.data[alias].id)]);
            await run("update monday_outbox set status = 'sent', sent_at = now(), last_error = null where id = any($1)", [operation.entryIds]);
          });
          sent += operation.entryIds.length;
        } else {
          await markSent(operation.entryIds);
          sent += operation.entryIds.length;
        }
      }
    }

    const status = failed ? "partial" : stopped ? "partial" : "done";
    await query("update sync_runs set finished_at = now(), status = $2, sent = $3, failed = $4, monday_calls = $5, error = $6 where id = $1", [
      runRow.id,
      status,
      sent,
      failed,
      counter.calls,
      stopped,
    ]);

    if (exhausted) await alertAdmins(runRow.id, exhaustedMessage(exhausted));

    return { runId: runRow.id, status, sent, failed, mondayCalls: counter.calls, note: stopped };
  } catch (err) {
    await query("update sync_runs set finished_at = now(), status = 'failed', sent = $2, failed = $3, monday_calls = $4, error = $5 where id = $1", [
      runRow.id,
      sent,
      failed,
      counter.calls,
      err.message,
    ]);
    await alertAdmins(runRow.id, `The Monday sync stopped with an error (${err.message}). Nothing is lost - it retries next run.`);
    throw err;
  } finally {
    await releaseLock();
  }
}

// Runs the sync now (one at a time per server; the lock covers the rest).
export function runSync(reason = "manual") {
  running ??= run(reason).finally(() => {
    running = null;
  });

  return running;
}

// For the Sync card: last run, queue, schedule.
export async function getSyncStatus() {
  const [{ rows: runs }, { rows: counts }, { rows: failures }] = await Promise.all([
    query("select * from sync_runs order by id desc limit 1"),
    query(`select count(*) filter (where status in ('pending', 'sending'))::int as waiting,
                  count(*) filter (where status = 'failed')::int as failed,
                  max(last_error) filter (where status = 'failed') as last_error
           from monday_outbox`),
    query("select board_id, monday_item_id, action, last_error, created_at from monday_outbox where status = 'failed' order by id desc limit 10"),
  ]);

  return {
    scheduled: syncEnabled(),
    nextRunAt: syncEnabled() ? nextRunAt?.toISOString() ?? null : null,
    running: Boolean(running),
    lastRun: runs[0] ?? null,
    waiting: counts[0].waiting,
    failed: counts[0].failed,
    lastError: counts[0].last_error,
    // The latest failed changes, with Monday's reason (most recent first).
    failures: failures.map((row) => ({
      board: tableOf(row.board_id) ?? row.board_id,
      itemId: row.monday_item_id === null ? null : String(row.monday_item_id),
      action: row.action,
      error: row.last_error,
      queuedAt: row.created_at,
    })),
    blockedForSeconds: mondayRetryAfterSeconds(),
  };
}

function scheduleNext() {
  const { hour, minute } = syncTime();
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));

  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);

  nextRunAt = next;
  setTimeout(() => {
    runSync("nightly")
      .then((result) => console.log("Nightly sync:", JSON.stringify(result)))
      .catch((err) => console.error("Nightly sync failed.", err.message))
      .finally(scheduleNext);
  }, next - now).unref();
}

export function startSyncSchedule() {
  if (!syncEnabled()) return;

  scheduleNext();

  // Catch up if the last run was over a day ago and changes are waiting.
  setTimeout(async () => {
    try {
      const { rows } = await query(
        `select (select max(started_at) from sync_runs where status in ('done', 'partial')) as last,
                (select count(*)::int from monday_outbox where status = 'pending') as waiting`,
      );
      const last = rows[0].last ? new Date(rows[0].last) : null;

      if (rows[0].waiting > 0 && (!last || Date.now() - last > 25 * 3_600_000)) {
        console.log("Sync: catching up on a missed night.", JSON.stringify(await runSync("catch-up")));
      }
    } catch (err) {
      console.error("Sync catch-up failed.", err.message);
    }
  }, CATCH_UP_DELAY_MS).unref();
}
