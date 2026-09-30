import { query } from "../database/db.js";

// The application_form_answers table (scripts/databaseSchema.js): the exact
// answers an application was created with in the app, for the application
// page's Preview. App-only: never sent to Monday.

export async function saveFormAnswers({ applicationId, formId, answers, createdBy }) {
  await query(
    `insert into application_form_answers (application_id, form_id, answers, created_by)
     values ($1, $2, $3, $4)
     on conflict (application_id, form_id) do update set answers = excluded.answers, created_by = excluded.created_by, created_at = now()`,
    [Number(applicationId), formId, JSON.stringify(answers), createdBy ? Number(createdBy) : null],
  );
}

// { answers, createdAt } or null when the application has none for the form.
export async function getFormAnswers(applicationId, formId) {
  if (!/^\d+$/.test(String(applicationId))) return null;

  const { rows } = await query("select answers, created_at from application_form_answers where application_id = $1 and form_id = $2", [
    Number(applicationId),
    formId,
  ]);

  return rows[0] ? { answers: rows[0].answers, createdAt: rows[0].created_at } : null;
}
