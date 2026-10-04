import { query } from "../database/db.js";
import { isDatabaseEnabled } from "../database/db.js";
import { JOTFORM_FORMS } from "./forms.js";
import { isJotformEnabled, listChangedSubmissions } from "./client.js";
import { receiveSubmission, hasHandler } from "./receive.js";

// The safety net for missed webhooks (docs/jotform-step3.md): every 30
// minutes, each form the app handles is asked for the submissions created
// or edited in the last 48 hours; any the app hasn't stored, or stored
// before their latest edit, is received as if its webhook had arrived (and
// re-applied only if its answers changed, submissionsStore.js). Older
// submissions are never pulled in here.

const EVERY_MS = 30 * 60 * 1000;
const FIRST_RUN_MS = 2 * 60 * 1000;
const LOOK_BACK_MS = 48 * 60 * 60 * 1000;

// Jotform's account time is Asia/Dubai (UTC+4); a UTC cut-off 48 hours back
// is early enough either way.
function since() {
  return new Date(Date.now() - LOOK_BACK_MS).toISOString().slice(0, 19).replace("T", " ");
}

let running = false;

// Answers how many submissions were received.
export async function checkForMissedSubmissions() {
  if (running || !isJotformEnabled() || !isDatabaseEnabled()) return 0;

  running = true;
  let received = 0;

  try {
    const forms = Object.entries(JOTFORM_FORMS).filter(([, form]) => hasHandler(form.kind));

    for (const [formId, form] of forms) {
      try {
        const recent = await listChangedSubmissions(formId, { since: since() });
        const { rows } = await query("select submission_id, jotform_updated_at from jotform_submissions where submission_id = any($1)", [
          recent.map((submission) => String(submission.id)),
        ]);
        const stored = new Map(rows.map((row) => [row.submission_id, row.jotform_updated_at]));
        const missed = recent.filter((submission) => !stored.has(String(submission.id)) || (stored.get(String(submission.id)) ?? null) !== (submission.updated_at ?? null));

        for (const submission of missed) {
          await receiveSubmission(String(submission.id), { via: "poll", expectedFormId: formId });
          received += 1;
        }
      } catch (err) {
        console.error(`Jotform check: ${form.name} failed.`, err.message);
      }
    }
  } finally {
    running = false;
  }

  if (received) console.log(`Jotform check: received ${received} submission(s) the webhook had missed.`);

  return received;
}

export function startJotformChecks() {
  setTimeout(() => {
    checkForMissedSubmissions().catch((err) => console.error("Jotform check failed.", err));
    setInterval(() => checkForMissedSubmissions().catch((err) => console.error("Jotform check failed.", err)), EVERY_MS);
  }, FIRST_RUN_MS);
}
