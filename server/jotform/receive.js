import { getSubmission } from "./client.js";
import { formKindOf } from "./forms.js";
import { saveSubmission, claimSubmission, setSubmissionStatus } from "./submissionsStore.js";

// What happens to a submission the server hears about (from the webhook,
// or later a scheduled check): fetch it from Jotform - so a forged request
// with a made-up id changes nothing - keep it in jotform_submissions, then
// hand it to its form kind's handler.
//
// A handler gets the claimed submission and answers { status, applicationId? }
// with status "processed" or "unmatched"; throwing marks it "failed".
// None are registered yet: submissions of the adoption forms stay
// "received" until their handlers exist, then get processed from the table.
const HANDLERS = {};

// A submission edited again while its handler ran is handled again, but
// not endlessly.
const MAX_ROUNDS = 3;

export async function receiveSubmission(submissionId, { via, expectedFormId = null }) {
  const submission = await getSubmission(submissionId);

  if (!submission) {
    console.warn(`Jotform: submission ${submissionId} not found in this account (or JOTFORM_API_KEY is wrong) - ignored.`);
    return null;
  }

  if (expectedFormId && String(submission.form_id) !== String(expectedFormId)) {
    console.warn(`Jotform: submission ${submissionId} belongs to form ${submission.form_id}, not ${expectedFormId} - ignored.`);
    return null;
  }

  const saved = await saveSubmission({ submission, formKind: formKindOf(submission.form_id), via });

  await processSubmission(saved);

  return saved;
}

// Runs the handler for a "received" submission, if its kind has one.
export async function processSubmission({ submissionId, formKind }) {
  const handler = HANDLERS[formKind];

  if (!handler) return;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const submission = await claimSubmission(submissionId);

    if (!submission) return;

    let outcome;

    try {
      const result = await handler(submission);
      outcome = { status: result.status, applicationId: result.applicationId ?? null };
    } catch (err) {
      console.error(`Jotform: handling submission ${submissionId} (${formKind}) failed.`, err);
      outcome = { status: "failed", error: String(err?.message ?? err).slice(0, 1000) };
    }

    const status = await setSubmissionStatus(submissionId, outcome.status, { ...outcome, handledUpdatedAt: submission.jotformUpdatedAt });

    if (status !== "received") return;
  }
}
