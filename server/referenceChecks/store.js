import { query } from "../database/db.js";

// The reference_checks table (scripts/databaseSchema.js): each referee's
// "Reference Check - IBKT" answers, linked to the application they're about
// (docs/jotform-step3.md). App-only: never sent to Monday. One row per
// Jotform submission; an edited submission replaces its row.

function toCheck(row) {
  return {
    id: String(row.id),
    submissionId: row.submission_id,
    applicationId: String(row.application_id),
    refereeSlot: row.referee_slot,
    referee: { name: row.referee_name, email: row.referee_email, phone: row.referee_phone },
    candidateName: row.candidate_name,
    criminalHistory: row.criminal_history,
    answers: row.answers,
    signatureUrl: row.signature_url,
    signedOn: row.signed_on,
    submittedAt: row.submitted_at,
    receivedAt: row.received_at,
  };
}

export async function saveReferenceCheck(check) {
  const { rows } = await query(
    `insert into reference_checks (submission_id, application_id, referee_slot, referee_name, referee_email, referee_phone,
       candidate_name, criminal_history, answers, signature_url, signed_on, submitted_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (submission_id) do update set
       application_id = excluded.application_id, referee_slot = excluded.referee_slot,
       referee_name = excluded.referee_name, referee_email = excluded.referee_email, referee_phone = excluded.referee_phone,
       candidate_name = excluded.candidate_name, criminal_history = excluded.criminal_history, answers = excluded.answers,
       signature_url = excluded.signature_url, signed_on = excluded.signed_on, submitted_at = excluded.submitted_at,
       received_at = now()
     returning *`,
    [
      String(check.submissionId),
      Number(check.applicationId),
      check.refereeSlot ?? null,
      check.referee.name || null,
      check.referee.email || null,
      check.referee.phone || null,
      check.candidateName || null,
      check.criminalHistory || null,
      JSON.stringify(check.answers),
      check.signatureUrl || null,
      check.signedOn || null,
      check.submittedAt || null,
    ],
  );

  return toCheck(rows[0]);
}

// An application's reference checks, in the order they arrived.
export async function listReferenceChecks(applicationId) {
  const { rows } = await query("select * from reference_checks where application_id = $1 order by received_at, id", [Number(applicationId)]);

  return rows.map(toCheck);
}

// The slots (1-3) already taken on an application, by another submission.
export async function takenSlots(applicationId, exceptSubmissionId) {
  const { rows } = await query(
    "select referee_slot from reference_checks where application_id = $1 and submission_id <> $2 and referee_slot is not null",
    [Number(applicationId), String(exceptSubmissionId)],
  );

  return new Set(rows.map((row) => row.referee_slot));
}
