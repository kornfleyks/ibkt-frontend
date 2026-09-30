// Handles Jotform submissions still waiting in jotform_submissions (status
// "received") whose form has a handler - e.g. Pre-Adoption submissions
// stored before the import existed. The server also does this at start.
// --retry-failed first sends "failed" ones back to be tried again (once
// the cause is fixed).
//
//   node scripts/processJotformSubmissions.js [--retry-failed]
import "dotenv/config";
import { processWaitingSubmissions } from "../jotform/receive.js";
import { retryFailedSubmissions } from "../jotform/submissionsStore.js";
import { flushActivityLog } from "../activityLog.js";

if (process.argv.includes("--retry-failed")) {
  console.log(`Retrying ${await retryFailedSubmissions()} failed submission(s).`);
}

const handled = await processWaitingSubmissions();

// Activity Log entries are written in batches - send them before exiting.
await flushActivityLog();

console.log(`Handled ${handled} waiting submission(s). See jotform_submissions for each status.`);
process.exit(0);
