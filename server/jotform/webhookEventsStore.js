import { query } from "../database/db.js";

// The jotform_webhook_events table (scripts/databaseSchema.js): every
// request that reached the Jotform webhook with the right secret, stored
// as it arrived - before the submission is fetched or saved - with what
// happened to it. If saving the submission fails, the raw payload is still
// here to review or replay. App-only: never sent to Monday.
//
// status: received  stored, still being handled (or the server stopped mid-way)
//         saved     the submission is in jotform_submissions
//         ignored   nothing to save (no submission id, not this account's,
//                   another form's id); error says why
//         failed    something went wrong; error says what

export async function recordWebhookEvent({ formId = null, submissionId = null, payload, status = "received", error = null }) {
  const { rows } = await query(
    `insert into jotform_webhook_events (form_id, submission_id, payload, status, error, finished_at)
     values ($1, $2, $3, $4, $5, case when $4 = 'received' then null else now() end)
     returning id`,
    [formId, submissionId, JSON.stringify(payload ?? {}), status, error],
  );

  return rows[0].id;
}

export async function finishWebhookEvent(id, status, error = null) {
  await query("update jotform_webhook_events set status = $2, error = $3, finished_at = now() where id = $1", [id, status, error]);
}
