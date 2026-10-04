import { query } from "../database/db.js";

// The jotform_submissions table (scripts/databaseSchema.js): every Jotform
// submission the server has received, with its full answers and what was
// done with it. App-only: never sent to Monday.
//
// status: received    waiting for its form's handler
//         processing  a handler is working on it (claimed, see claimSubmission)
//         processed   applied to the app (application_id says where)
//         unmatched   no application to update: needs a person
//         failed      the handler threw (error says why); can be retried
//         log_only    kept only, nothing to apply
//
// Jotform's created_at / updated_at are kept as Jotform wrote them (no
// timezone given).

function toSubmission(row) {
  return {
    submissionId: row.submission_id,
    formId: row.form_id,
    formKind: row.form_kind,
    status: row.status,
    answers: row.answers,
    jotformCreatedAt: row.jotform_created_at,
    jotformUpdatedAt: row.jotform_updated_at,
    applicationId: row.application_id === null ? null : String(row.application_id),
    error: row.error,
    receivedVia: row.received_via,
    receiveCount: row.receive_count,
  };
}

// Saves a submission fetched from Jotform. A repeat of an unchanged
// submission (webhook retry, or webhook and a later check both seeing it)
// keeps its status; one whose answers changed (an edit, e.g. a contract
// being signed) goes back to "received" so its handler sees the new
// answers. Jotform also moves updated_at without any answer changing
// (most Pre-Adoption submissions have one), so the answers decide - an
// old form is never re-applied over a volunteer's changes for nothing. While a
// handler is running the status stays "processing": setSubmissionStatus
// then notices the newer version and hands it back as "received".
export async function saveSubmission({ submission, formKind, via }) {
  const { rows } = await query(
    `insert into jotform_submissions (submission_id, form_id, form_kind, status, answers, jotform_created_at, jotform_updated_at, received_via)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (submission_id) do update set
       form_kind = excluded.form_kind,
       answers = excluded.answers,
       jotform_updated_at = excluded.jotform_updated_at,
       status = case
         when jotform_submissions.answers is distinct from excluded.answers
           and jotform_submissions.status not in ('log_only', 'processing')
         then 'received'
         else jotform_submissions.status
       end,
       last_received_at = now(),
       receive_count = jotform_submissions.receive_count + 1
     returning *`,
    [
      String(submission.id),
      String(submission.form_id),
      formKind,
      formKind === "log_only" ? "log_only" : "received",
      JSON.stringify(submission.answers ?? {}),
      submission.created_at ?? null,
      submission.updated_at ?? null,
      via,
    ],
  );

  return toSubmission(rows[0]);
}

// [{ submissionId, formId }] still "received", oldest first.
export async function waitingSubmissions() {
  const { rows } = await query("select submission_id, form_id from jotform_submissions where status = 'received' order by first_received_at");

  return rows.map((row) => ({ submissionId: row.submission_id, formId: row.form_id }));
}

// Sends "failed" submissions back to "received" (after the cause is fixed),
// so processWaitingSubmissions tries them again. Answers how many.
export async function retryFailedSubmissions() {
  const { rowCount } = await query("update jotform_submissions set status = 'received', error = null where status = 'failed'");

  return rowCount;
}

// Moves a "received" submission to "processing" and answers it, or null
// when it isn't waiting (already handled, or another request claimed it
// first). Keeps two deliveries of one submission from both applying it.
export async function claimSubmission(submissionId) {
  const { rows } = await query(
    `update jotform_submissions set status = 'processing', attempts = attempts + 1
     where submission_id = $1 and status = 'received'
     returning *`,
    [submissionId],
  );

  return rows[0] ? toSubmission(rows[0]) : null;
}

// Records a handler's outcome for the version it handled (handledUpdatedAt,
// from the claimed submission). If a newer version arrived meanwhile, the
// submission goes back to "received" instead, and the answer says so.
export async function setSubmissionStatus(submissionId, status, { handledUpdatedAt, applicationId = null, error = null }) {
  const { rows } = await query(
    `update jotform_submissions
     set status = case when jotform_updated_at is distinct from $5 then 'received' else $2 end,
         application_id = coalesce($3, application_id),
         error = $4,
         processed_at = now()
     where submission_id = $1
     returning status`,
    [submissionId, status, applicationId === null ? null : Number(applicationId), error, handledUpdatedAt ?? null],
  );

  return rows[0]?.status ?? null;
}
