import { query } from "../database/db.js";

// Call transcripts pasted as text (the call_transcripts table,
// scripts/databaseSchema.js). Uploaded transcript files live on Monday
// instead (see routes.js).

function toTranscript(row) {
  return {
    id: String(row.id),
    call: Number(row.call_number),
    text: row.body,
    characters: row.body.length,
    createdBy: row.created_by_name ? { id: row.created_by_id, name: row.created_by_name, role: row.created_by_role ?? "" } : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

// Newest first.
export async function listTranscripts(applicationId, call) {
  const params = [Number(applicationId)];
  let filter = "";

  if (call !== undefined) {
    params.push(Number(call));
    filter = "and call_number = $2";
  }

  const { rows } = await query(`select * from call_transcripts where monday_item_id = $1 ${filter} order by created_at desc, id desc`, params);

  return rows.map(toTranscript);
}

export async function addTranscript({ applicationId, call, text, by }) {
  const { rows } = await query(
    `insert into call_transcripts (monday_item_id, call_number, body, created_by_id, created_by_name, created_by_role)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [Number(applicationId), Number(call), text, by.id, by.name, by.role],
  );

  return toTranscript(rows[0]);
}

// The removed transcript, or null when it isn't on this application / call.
export async function deleteTranscript({ applicationId, call, id }) {
  const { rows } = await query("delete from call_transcripts where id = $1 and monday_item_id = $2 and call_number = $3 returning *", [
    Number(id),
    Number(applicationId),
    Number(call),
  ]);

  return rows[0] ? toTranscript(rows[0]) : null;
}
