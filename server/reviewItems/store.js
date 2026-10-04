import { query } from "../database/db.js";

// The review_items table (scripts/databaseSchema.js): a standing punch-list
// for client calls (questions to ask, things to flag, internal to-dos),
// with a place to record the answer. App-only: never sent to Monday.

function toItem(row) {
  return {
    id: String(row.id),
    category: row.category,
    title: row.title,
    detail: row.detail,
    status: row.status,
    answer: row.answer,
    answeredByName: row.answered_by_name,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Oldest first within each category; the page groups by category itself.
export async function listReviewItems() {
  const { rows } = await query("select * from review_items order by category, created_at");

  return rows.map(toItem);
}

export async function createReviewItem({ category, title, detail }) {
  const { rows } = await query(
    `insert into review_items (category, title, detail) values ($1, $2, $3) returning *`,
    [category, title, detail || null],
  );

  return toItem(rows[0]);
}

// changes: any of { category, title, detail, status, answer }. Answering a
// still-open item marks it "answered" unless `status` is given explicitly;
// clearing the answer on an "answered" (not "resolved") item reopens it.
export async function updateReviewItem(id, changes, actorName) {
  const { rows: current } = await query("select * from review_items where id = $1", [Number(id)]);

  if (!current[0]) return null;

  const before = toItem(current[0]);
  const next = { ...before, ...changes };

  if (changes.answer !== undefined && changes.status === undefined) {
    const answered = (changes.answer ?? "").trim() !== "";

    if (answered && before.status === "open") next.status = "answered";
    else if (!answered && before.status === "answered") next.status = "open";
  }

  const answeredNow = changes.answer !== undefined && (changes.answer ?? "").trim() !== "" && before.answer !== changes.answer;

  const { rows } = await query(
    `update review_items set
       category = $2, title = $3, detail = $4, status = $5, answer = $6,
       answered_by_name = case when $7 then $8 else answered_by_name end,
       answered_at = case when $7 then now() else answered_at end,
       updated_at = now()
     where id = $1
     returning *`,
    [Number(id), next.category, next.title, next.detail || null, next.status, next.answer || null, answeredNow, actorName || null],
  );

  return toItem(rows[0]);
}

export async function deleteReviewItem(id) {
  const { rowCount } = await query("delete from review_items where id = $1", [Number(id)]);

  return rowCount > 0;
}
