import { query } from "../database/db.js";
import { UPDATE_AFTER_MONTHS, OVERDUE_AFTER_DAYS } from "../../src/constants/catUpdates.js";

// The cat_update_clock table (scripts/databaseSchema.js): one row per Adoption
// Ready cat. The clock runs from `ready_since`, or from the last update
// received, and the next update is due UPDATE_AFTER_MONTHS later. App-only.

// The clock's start, due date and overdue date are worked out in SQL so month
// arithmetic is the database's, not ours.
const SELECT = `
  select *,
    coalesce(last_received_at, ready_since) as clock_start,
    coalesce(last_received_at, ready_since) + make_interval(months => ${Number(UPDATE_AFTER_MONTHS)}) as due_at,
    requested_at + make_interval(days => ${Number(OVERDUE_AFTER_DAYS)}) as overdue_due_at
  from cat_update_clock`;

const iso = (value) => (value ? new Date(value).toISOString() : null);

function toClock(row) {
  return {
    catId: String(row.cat_id),
    readySince: iso(row.ready_since),
    lastReceivedAt: iso(row.last_received_at),
    lastReceivedNote: row.last_received_note ?? "",
    lastReceivedBy: row.last_received_by ?? "",
    requestedAt: iso(row.requested_at),
    overdueAt: iso(row.overdue_at),
    dueAt: iso(row.due_at),
    // When an unanswered request becomes Overdue.
    overdueDueAt: iso(row.overdue_due_at),
  };
}

export async function getClock(catId) {
  const { rows } = await query(`${SELECT} where cat_id = $1`, [Number(catId)]);

  return rows[0] ? toClock(rows[0]) : null;
}

export async function listClocks() {
  const { rows } = await query(`${SELECT} order by cat_id`);

  return rows.map(toClock);
}

// Starts the clock now unless the cat has one (the daily check does this for
// Adoption Ready cats that became ready before the check existed).
export async function startClock(catId) {
  await query("insert into cat_update_clock (cat_id) values ($1) on conflict (cat_id) do nothing", [Number(catId)]);

  return getClock(catId);
}

// A cat that has just become Adoption Ready: a fresh clock.
export async function resetClock(catId) {
  await query(
    `insert into cat_update_clock (cat_id) values ($1)
     on conflict (cat_id) do update set
       ready_since = now(), last_received_at = null, last_received_note = null, last_received_by = null,
       requested_at = null, overdue_at = null`,
    [Number(catId)],
  );
}

// A cat that is no longer waiting for a home.
export async function clearClock(catId) {
  await query("delete from cat_update_clock where cat_id = $1", [Number(catId)]);
}

// Each of these answers true for the one caller that made the change, so two
// servers running the daily check at once only notify once.
export async function claimRequested(catId) {
  const { rowCount } = await query("update cat_update_clock set requested_at = now() where cat_id = $1 and requested_at is null", [Number(catId)]);

  return rowCount > 0;
}

export async function claimOverdue(catId) {
  const { rowCount } = await query("update cat_update_clock set overdue_at = now() where cat_id = $1 and requested_at is not null and overdue_at is null", [Number(catId)]);

  return rowCount > 0;
}

// News arrived: the clock restarts from now and any request is closed.
export async function recordReceived(catId, { note, by }) {
  await startClock(catId);
  await query(
    `update cat_update_clock set last_received_at = now(), last_received_note = $2, last_received_by = $3, requested_at = null, overdue_at = null
     where cat_id = $1`,
    [Number(catId), note || null, by || null],
  );

  return getClock(catId);
}
