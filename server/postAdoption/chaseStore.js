import { query } from "../database/db.js";

// The post_adoption_chase table (scripts/databaseSchema.js): for each
// check-in of a post-adoption record that is waiting, how often it was
// chased (attempts) and reminded (reminders). App-only. Dates are
// "YYYY-MM-DD" strings, worked out by the database (a `date` read as a JS
// Date would move with the time zone).

const COLUMNS = `record_id, check_in_key, attempts, to_char(last_sent_on, 'YYYY-MM-DD') as last_sent_on, reminders,
  to_char(last_reminded_on, 'YYYY-MM-DD') as last_reminded_on, escalated_at`;

function toRow(row) {
  return {
    recordId: String(row.record_id),
    checkIn: row.check_in_key,
    attempts: Number(row.attempts),
    lastSentOn: row.last_sent_on ?? null,
    reminders: Number(row.reminders),
    lastRemindedOn: row.last_reminded_on ?? null,
    escalatedAt: row.escalated_at ? new Date(row.escalated_at).toISOString() : null,
  };
}

export async function listRows() {
  const { rows } = await query(`select ${COLUMNS} from post_adoption_chase order by record_id, check_in_key`);

  return rows.map(toRow);
}

// { [checkInKey]: row } for one record.
export async function rowsOfRecord(recordId) {
  const { rows } = await query(`select ${COLUMNS} from post_adoption_chase where record_id = $1`, [Number(recordId)]);

  return Object.fromEntries(rows.map(toRow).map((row) => [row.checkIn, row]));
}

// A check-in just marked Sent: a new phase, attempt 1.
export async function markSent(recordId, checkIn, today) {
  await query(
    `insert into post_adoption_chase (record_id, check_in_key, attempts, last_sent_on) values ($1, $2, 1, $3::date)
     on conflict (record_id, check_in_key) do update set
       attempts = 1, last_sent_on = $3::date, reminders = 0, last_reminded_on = null, escalated_at = null`,
    [Number(recordId), checkIn, today],
  );
}

// The check-in left Sent / due (received, concern, no response, back to Not Due).
export async function clearRow(recordId, checkIn) {
  await query("delete from post_adoption_chase where record_id = $1 and check_in_key = $2", [Number(recordId), checkIn]);
}

// "Chased again": one more unanswered attempt today. A Sent check-in with no
// row yet (marked Sent before the reminders existed) counts as attempt 1, so
// this is attempt 2. Answers the row.
export async function chasedAgain(recordId, checkIn, today) {
  const { rows } = await query(
    `insert into post_adoption_chase (record_id, check_in_key, attempts, last_sent_on) values ($1, $2, 2, $3::date)
     on conflict (record_id, check_in_key) do update set
       attempts = post_adoption_chase.attempts + 1, last_sent_on = $3::date, escalated_at = null
     returning ${COLUMNS}`,
    [Number(recordId), checkIn, today],
  );

  return toRow(rows[0]);
}

// Each claim answers true for the one caller that made it, so two servers
// running the daily check at once never remind twice.

// A reminder to send a check-in that is due: at most `max`, `intervalDays` apart.
export async function claimSendReminder(recordId, checkIn, today, { intervalDays, max }) {
  const { rowCount } = await query(
    `insert into post_adoption_chase (record_id, check_in_key, reminders, last_reminded_on) values ($1, $2, 1, $3::date)
     on conflict (record_id, check_in_key) do update set
       reminders = post_adoption_chase.reminders + 1, last_reminded_on = $3::date
     where post_adoption_chase.reminders < $5
       and (post_adoption_chase.last_reminded_on is null or post_adoption_chase.last_reminded_on <= $3::date - $4::int)`,
    [Number(recordId), checkIn, today, intervalDays, max],
  );

  return rowCount > 0;
}

// A reminder to chase again, once for each attempt (`lastSent` is when it was
// last sent). An attempt's reminder is due `intervalDays` after it, so it has
// been sent when the last reminder is on or after that day; a chase on the
// very day of the previous reminder therefore still gets its own.
export async function claimChaseReminder(recordId, checkIn, today, lastSent, { intervalDays }) {
  const { rowCount } = await query(
    `insert into post_adoption_chase (record_id, check_in_key, attempts, last_sent_on, last_reminded_on) values ($1, $2, 1, $4::date, $3::date)
     on conflict (record_id, check_in_key) do update set last_reminded_on = $3::date
     where post_adoption_chase.last_reminded_on is null
        or post_adoption_chase.last_reminded_on < coalesce(post_adoption_chase.last_sent_on, $4::date) + $5::int`,
    [Number(recordId), checkIn, today, lastSent, intervalDays],
  );

  return rowCount > 0;
}

// The one escalation of this phase (a check-in that is being missed, or the
// end of chasing).
export async function claimEscalation(recordId, checkIn) {
  const { rowCount } = await query(
    `insert into post_adoption_chase (record_id, check_in_key, escalated_at) values ($1, $2, now())
     on conflict (record_id, check_in_key) do update set escalated_at = now()
     where post_adoption_chase.escalated_at is null`,
    [Number(recordId), checkIn],
  );

  return rowCount > 0;
}

// After a failed escalation, so the next daily check tries again.
export async function releaseEscalation(recordId, checkIn) {
  await query("update post_adoption_chase set escalated_at = null where record_id = $1 and check_in_key = $2", [Number(recordId), checkIn]);
}
