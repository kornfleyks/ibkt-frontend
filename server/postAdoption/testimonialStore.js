import { query } from "../database/db.js";

// The post_adoption_testimonial table (scripts/databaseSchema.js): one row per
// post-adoption record that has a testimonial request (a record with no row is
// Not requested). App-only: never sent to Monday. Dates are "YYYY-MM-DD"
// strings, worked out by the database (a `date` read as a JS Date would move
// with the time zone).

const COLUMNS = `record_id, status, attempts, to_char(requested_on, 'YYYY-MM-DD') as requested_on,
  to_char(last_requested_on, 'YYYY-MM-DD') as last_requested_on, to_char(last_reminded_on, 'YYYY-MM-DD') as last_reminded_on,
  to_char(received_on, 'YYYY-MM-DD') as received_on, testimonial, may_publish`;

function toState(row) {
  return {
    recordId: String(row.record_id),
    status: row.status,
    attempts: Number(row.attempts),
    requestedOn: row.requested_on ?? null,
    lastRequestedOn: row.last_requested_on ?? null,
    lastRemindedOn: row.last_reminded_on ?? null,
    receivedOn: row.received_on ?? null,
    text: row.testimonial ?? "",
    mayPublish: Boolean(row.may_publish),
  };
}

// The state of one record, or null when it has none.
export async function getTestimonial(recordId) {
  const { rows } = await query(`select ${COLUMNS} from post_adoption_testimonial where record_id = $1`, [Number(recordId)]);

  return rows[0] ? toState(rows[0]) : null;
}

// Every record that is waiting for an answer (the daily check).
export async function listRequested(status) {
  const { rows } = await query(`select ${COLUMNS} from post_adoption_testimonial where status = $1 order by record_id`, [status]);

  return rows.map(toState);
}

// Saves the whole state (a new request starts a new phase, so the reminders
// start again) and answers what was stored.
export async function saveTestimonial(recordId, state, byName) {
  const { rows } = await query(
    `insert into post_adoption_testimonial
       (record_id, status, attempts, requested_on, last_requested_on, last_reminded_on, received_on, testimonial, may_publish, updated_at, updated_by)
     values ($1, $2, $3, $4::date, $5::date, null, $6::date, $7, $8, now(), $9)
     on conflict (record_id) do update set
       status = $2, attempts = $3, requested_on = $4::date, last_requested_on = $5::date,
       last_reminded_on = case when post_adoption_testimonial.last_requested_on is distinct from $5::date then null else post_adoption_testimonial.last_reminded_on end,
       received_on = $6::date, testimonial = $7, may_publish = $8, updated_at = now(), updated_by = $9
     returning ${COLUMNS}`,
    [Number(recordId), state.status, state.attempts, state.requestedOn, state.lastRequestedOn, state.receivedOn, state.text, state.mayPublish, byName],
  );

  return toState(rows[0]);
}

export async function removeTestimonial(recordId) {
  await query("delete from post_adoption_testimonial where record_id = $1", [Number(recordId)]);
}

// Each claim answers true for the one caller that made it, so two servers
// running the daily check at once never remind twice.

// The reminder to chase again, once for each attempt: `intervalDays` after the
// attempt, while it is still Requested and below `max` attempts.
export async function claimChaseReminder(recordId, today, { intervalDays, max }) {
  const { rowCount } = await query(
    `update post_adoption_testimonial set last_reminded_on = $2::date
     where record_id = $1 and status = 'Requested' and attempts < $4
       and last_requested_on + $3::int <= $2::date
       and (last_reminded_on is null or last_reminded_on < last_requested_on + $3::int)`,
    [Number(recordId), today, intervalDays, max],
  );

  return rowCount > 0;
}

// The end of chasing: `intervalDays` after the last attempt (the `max`th) with
// no answer, the request becomes No response.
export async function claimNoResponse(recordId, today, { intervalDays, max }) {
  const { rowCount } = await query(
    `update post_adoption_testimonial set status = 'No response', updated_at = now(), updated_by = 'IBKT System'
     where record_id = $1 and status = 'Requested' and attempts >= $4 and last_requested_on + $3::int <= $2::date`,
    [Number(recordId), today, intervalDays, max],
  );

  return rowCount > 0;
}
