import { query } from "../database/db.js";

// The adoption_form_invites table (scripts/databaseSchema.js): each time a
// volunteer sent an applicant the Adoption Form link, newest first on read.
// App-only: never sent to Monday.

function toInvite(row) {
  return {
    id: String(row.id),
    formKey: row.form_key,
    formId: row.form_id,
    method: row.method,
    link: row.link,
    sentBy: row.sent_by_id ? { id: row.sent_by_id, name: row.sent_by_name } : null,
    sentAt: row.sent_at,
  };
}

export async function addInvite({ applicationId, formKey, formId, method, link, sentBy }) {
  const { rows } = await query(
    `insert into adoption_form_invites (application_id, form_key, form_id, method, link, sent_by_id, sent_by_name)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [Number(applicationId), formKey, formId, method, link, sentBy?.id ?? null, sentBy?.name ?? null],
  );

  return toInvite(rows[0]);
}

export async function listInvites(applicationId) {
  const { rows } = await query("select * from adoption_form_invites where application_id = $1 order by sent_at desc, id desc", [
    Number(applicationId),
  ]);

  return rows.map(toInvite);
}
