import { query } from "../database/db.js";

// The extra screening calls of an application, from Call 3 on (the
// application_calls table, scripts/databaseSchema.js). Calls 1 and 2 keep
// their date and summary in the application's own columns; their pasted
// transcripts and these calls' are in call_transcripts, their files in the
// "Additional Call Transcripts" column (see routes.js).

// The most extra calls one application can have.
export const MAX_EXTRA_CALLS = 20;
export const FIRST_EXTRA_CALL = 3;

function toCall(row) {
  return {
    call: Number(row.call_number),
    date: row.call_date ? new Date(row.call_date).toISOString().slice(0, 10) : "",
    summary: row.summary ?? "",
    createdBy: row.created_by_name ? { id: row.created_by_id, name: row.created_by_name, role: row.created_by_role ?? "" } : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// In call order.
export async function listCalls(applicationId) {
  const { rows } = await query("select * from application_calls where monday_item_id = $1 order by call_number", [Number(applicationId)]);

  return rows.map(toCall);
}

export async function getCall(applicationId, call) {
  const { rows } = await query("select * from application_calls where monday_item_id = $1 and call_number = $2", [Number(applicationId), Number(call)]);

  return rows[0] ? toCall(rows[0]) : null;
}

// The next call number (3 for the first extra call), or null at the limit.
// Answers the new call; two people adding at once get different numbers or
// one of them null (the unique key refuses the second insert of a number).
export async function addCall({ applicationId, by }) {
  const { rows } = await query(
    `insert into application_calls (monday_item_id, call_number, created_by_id, created_by_name, created_by_role)
     select $1, coalesce(max(call_number), ${FIRST_EXTRA_CALL - 1}) + 1, $2, $3, $4
     from application_calls where monday_item_id = $1
     having count(*) < ${MAX_EXTRA_CALLS}
     returning *`,
    [Number(applicationId), by.id, by.name, by.role],
  );

  return rows[0] ? toCall(rows[0]) : null;
}

// changes: { date?: "YYYY-MM-DD" | "", summary?: string }. Answers the call, or null when it doesn't exist.
export async function updateCall({ applicationId, call, changes }) {
  const { rows: current } = await query("select * from application_calls where monday_item_id = $1 and call_number = $2", [Number(applicationId), Number(call)]);

  if (!current[0]) return null;

  const next = {
    date: changes.date !== undefined ? changes.date || null : current[0].call_date,
    summary: changes.summary !== undefined ? changes.summary || null : current[0].summary,
  };
  const { rows } = await query(
    `update application_calls set call_date = $3, summary = $4, updated_at = now()
     where monday_item_id = $1 and call_number = $2 returning *`,
    [Number(applicationId), Number(call), next.date, next.summary],
  );

  return toCall(rows[0]);
}

// Removes the call and its pasted transcripts. The removed call, or null when it doesn't exist.
export async function deleteCall({ applicationId, call }) {
  await query("delete from call_transcripts where monday_item_id = $1 and call_number = $2", [Number(applicationId), Number(call)]);

  const { rows } = await query("delete from application_calls where monday_item_id = $1 and call_number = $2 returning *", [Number(applicationId), Number(call)]);

  return rows[0] ? toCall(rows[0]) : null;
}
