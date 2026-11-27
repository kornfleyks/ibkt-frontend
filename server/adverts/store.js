import { query } from "../database/db.js";

// Draft adverts for cats (the cat_advert_drafts table, scripts/databaseSchema.js).
// Every generation is one row, so a regenerated draft keeps the history; the
// newest row of a cat is the one shown. A row is 'draft' (has a body),
// 'failed' (has the error) or 'approved' (the approved text, which locks the
// advert for good).

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

// Thrown when a cat's advert is approved: an approved advert is locked, so
// nothing new can be saved for the cat.
export class AdvertLockedError extends Error {
  constructor() {
    super("This advert is approved and locked, so it cannot be changed.");
  }
}

// Saves a draft or a failure. The insert itself refuses when the cat has an
// approved row, so a draft that finishes after an approval cannot replace it.
export async function saveDraft({ catId, status, body = null, error = null, model = null, reason, by = null }) {
  const { rows } = await query(
    `insert into cat_advert_drafts (cat_id, status, body, error, model, reason, created_by_id, created_by_name)
     select $1::bigint, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text
     where not exists (select 1 from cat_advert_drafts where cat_id = $1::bigint and status = 'approved')
     returning *`,
    [Number(catId), status, body, error, model, reason, by?.id ?? null, by?.name ?? null],
  );

  if (!rows[0]) throw new AdvertLockedError();

  return toDraft(rows[0]);
}

// Approves the newest draft of a cat: a new row, status 'approved', with the
// same text. An approved advert is never changed again. Answers null when the
// newest row is not a draft (nothing to approve, or already approved).
export async function approveLatest(catId, by) {
  const { rows } = await query(
    `with latest as (
       select * from cat_advert_drafts where cat_id = $1 order by created_at desc, id desc limit 1
     )
     insert into cat_advert_drafts (cat_id, status, body, model, reason, created_by_id, created_by_name)
     select cat_id, 'approved', body, model, 'approve', $2, $3 from latest where status = 'draft'
     returning *`,
    [Number(catId), by?.id ?? null, by?.name ?? null],
  );

  return rows[0] ? toDraft(rows[0]) : null;
}

// The newest draft or failure of a cat, or null.
export async function latestDraft(catId) {
  const { rows } = await query("select * from cat_advert_drafts where cat_id = $1 order by created_at desc, id desc limit 1", [Number(catId)]);

  return rows[0] ? toDraft(rows[0]) : null;
}

// How many generations were made today (UTC), for the daily cap. Manual edits
// and approvals are not generations, so they are not counted.
export async function generationsToday() {
  const { rows } = await query(
    "select count(*)::int as count from cat_advert_drafts where reason not in ('edit', 'approve') and created_at >= (now() at time zone 'utc')::date",
  );

  return rows[0].count;
}
