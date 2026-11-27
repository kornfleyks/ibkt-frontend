import { query } from "../database/db.js";

// Draft adverts for cats (the cat_advert_drafts table, scripts/databaseSchema.js).
// Every generation is one row, so a regenerated draft keeps the history; the
// newest row of a cat is the one shown. A row is 'draft' (has a body) or
// 'failed' (has the error).

function toDraft(row) {
  return {
    id: String(row.id),
    catId: String(row.cat_id),
    status: row.status,
    body: row.body,
    error: row.error,
    model: row.model,
    reason: row.reason,
    createdBy: row.created_by_name ? { id: row.created_by_id, name: row.created_by_name } : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function saveDraft({ catId, status, body = null, error = null, model = null, reason, by = null }) {
  const { rows } = await query(
    `insert into cat_advert_drafts (cat_id, status, body, error, model, reason, created_by_id, created_by_name)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [Number(catId), status, body, error, model, reason, by?.id ?? null, by?.name ?? null],
  );

  return toDraft(rows[0]);
}

// The newest draft or failure of a cat, or null.
export async function latestDraft(catId) {
  const { rows } = await query("select * from cat_advert_drafts where cat_id = $1 order by created_at desc, id desc limit 1", [Number(catId)]);

  return rows[0] ? toDraft(rows[0]) : null;
}

// How many generations were made today (UTC), for the daily cap. Manual edits
// are not generations, so they are not counted.
export async function generationsToday() {
  const { rows } = await query(
    "select count(*)::int as count from cat_advert_drafts where reason <> 'edit' and created_at >= (now() at time zone 'utc')::date",
  );

  return rows[0].count;
}
