// One-off: brings the client's current Jotform applicants into the app
// (docs/jotform-backfill.md): Pre-Adoption Forms of the last 6 weeks,
// Adoption Forms (UK/US and UAE) of the last 6 months, and for each
// Adoption Form its applicant's Pre-Adoption Form (same email, last 13
// months) so it has an application to land on. Goes through the webhook's
// own path (receiveSubmission, via "backfill"), oldest first: Pre-Adoption,
// then Adoption Forms, then UAE forms (stored; applied once that handler
// exists). Submissions already in the app are skipped; no unmatched bells
// (a summary is printed instead).
//
//   node scripts/importJotformSubmissions.js           # dry run: the plan, Monday calls, today's usage
//   node scripts/importJotformSubmissions.js --apply   # import
import "dotenv/config";
import { ADOPTION_REFERENCES_FORM_ID } from "../jotform/adoptionReferences/questions.js";
import { PRE_ADOPTION_FORM_ID } from "../../src/constants/forms/preAdoptionForm.js";
import { listFormSubmissions } from "../jotform/client.js";
import { receiveSubmission } from "../jotform/receive.js";
import { query, closeDatabase } from "../database/db.js";
import { flushActivityLog } from "../activityLog.js";
import { syncMondayUsageFromMonday } from "../mondayUsageSync.js";
import { getMondayUsage } from "../mondayUsage.js";

const APPLY = process.argv.includes("--apply");
const UAE_FORM_ID = "202981102716450";
const PRE_ADOPTION_WEEKS = 6;
const ADOPTION_FORM_MONTHS = 6;
const PRE_ADOPTION_LOOKUP_DAYS = 400;
// Questions: e-mail and photos on the Pre-Adoption; e-mail and ID uploads on the Adoption Form.
const PA_EMAIL = "124";
const PA_PHOTOS = "200";
const AF_EMAIL = "124";
const AF_IDS = ["169", "170"];
const UAE_EMAIL = "124";

function daysAgo(days) {
  return `${new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)} 00:00:00`;
}

const emailOf = (submission, qid) => String(submission.answers?.[qid]?.answer ?? "").trim().toLowerCase();
const nameOf = (submission) => {
  const answer = submission.answers?.["119"]?.answer;

  return [answer?.first, answer?.last].filter(Boolean).join(" ").trim() || "(no name)";
};
const uploads = (submission, qids) =>
  qids.flatMap((qid) => {
    const answer = submission.answers?.[qid]?.answer;

    return (Array.isArray(answer) ? answer : answer ? [answer] : []).filter((url) => /^https:\/\//.test(String(url)));
  });

const [preAdoptions, adoptionForms, uaeForms, { rows: stored }] = await Promise.all([
  listFormSubmissions(PRE_ADOPTION_FORM_ID, { since: daysAgo(PRE_ADOPTION_LOOKUP_DAYS) }),
  listFormSubmissions(ADOPTION_REFERENCES_FORM_ID, { since: daysAgo(ADOPTION_FORM_MONTHS * 30.5) }),
  listFormSubmissions(UAE_FORM_ID, { since: daysAgo(ADOPTION_FORM_MONTHS * 30.5) }),
  query("select submission_id from jotform_submissions"),
]);
const already = new Set(stored.map((row) => row.submission_id));

// The applicant's latest Pre-Adoption Form before their Adoption Form.
function preAdoptionFor(email, before) {
  return preAdoptions.filter((submission) => emailOf(submission, PA_EMAIL) === email && submission.created_at <= before).at(-1) ?? null;
}

const recentCutoff = daysAgo(PRE_ADOPTION_WEEKS * 7);
const paPlan = new Map(preAdoptions.filter((submission) => submission.created_at >= recentCutoff).map((submission) => [submission.id, submission]));
const noPreAdoption = [];

for (const [form, emailQid] of [[adoptionForms, AF_EMAIL], [uaeForms, UAE_EMAIL]]) {
  for (const submission of form) {
    const preAdoption = preAdoptionFor(emailOf(submission, emailQid), submission.created_at);

    if (preAdoption) paPlan.set(preAdoption.id, preAdoption);
    else if (form === adoptionForms) noPreAdoption.push(submission);
  }
}

const paList = [...paPlan.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
const todo = (list) => list.filter((submission) => !already.has(String(submission.id)));
const paTodo = todo(paList);
const afTodo = todo(adoptionForms);
const uaeTodo = todo(uaeForms);

// Emails with more than one Pre-Adoption in the plan: each makes its own
// application, and a later Adoption Form by that email can't tell which.
const byEmail = new Map();
for (const submission of paTodo) byEmail.set(emailOf(submission, PA_EMAIL), [...(byEmail.get(emailOf(submission, PA_EMAIL)) ?? []), submission]);
const repeated = [...byEmail.entries()].filter(([email, list]) => email && list.length > 1);
const repeatedWithAf = repeated.filter(([email]) => afTodo.some((submission) => emailOf(submission, AF_EMAIL) === email));

const photoFiles = paTodo.reduce((sum, submission) => sum + uploads(submission, [PA_PHOTOS]).length, 0);
const photoApps = paTodo.filter((submission) => uploads(submission, [PA_PHOTOS]).length > 0).length;
const idFiles = afTodo.reduce((sum, submission) => sum + uploads(submission, AF_IDS).length, 0);
const idApps = afTodo.filter((submission) => uploads(submission, AF_IDS).length > 0).length;
// 1 call per application created, 1 per file copied, 1 per file column refreshed.
const mondayCalls = paTodo.length + photoFiles + photoApps + idFiles + idApps;

console.log(`Pre-Adoption Forms: ${paTodo.length} to import (${paList.length - paTodo.length} already in the app)`);
console.log(`  of which last ${PRE_ADOPTION_WEEKS} weeks: ${paTodo.filter((s) => s.created_at >= recentCutoff).length}, older ones brought in for an Adoption Form: ${paTodo.filter((s) => s.created_at < recentCutoff).length}`);
console.log(`Adoption Forms (UK/US): ${afTodo.length} to import, ${noPreAdoption.length} without a Pre-Adoption Form by the same email (will be unmatched)`);
console.log(`UAE forms: ${uaeTodo.length} to store (applied once their handler exists)`);
console.log(`Emails with several Pre-Adoption Forms in the plan: ${repeated.length} (${repeatedWithAf.length} also have an Adoption Form, which would be unmatched)`);
console.log(`Files to copy to Monday: ${photoFiles} photos (${photoApps} applications), ${idFiles} ID files (${idApps} applications)`);

await syncMondayUsageFromMonday();
const usage = getMondayUsage();
console.log(`Monday calls needed: about ${mondayCalls}. Today so far: ${usage.count ?? "unknown"} of ${usage.limit} (shared with the live app).`);

if (!APPLY) {
  console.log("\nDry run: nothing imported. Run again with --apply to import.");
  await closeDatabase();
  process.exit(0);
}

const results = { processed: 0, unmatched: [], failed: [], stored: 0 };

for (const submission of [...paTodo, ...afTodo, ...uaeTodo]) {
  try {
    await receiveSubmission(String(submission.id), { via: "backfill", quiet: true });
  } catch (err) {
    results.failed.push(`${submission.id} ${nameOf(submission)}: ${err.message}`);
  }
}

const ids = [...paTodo, ...afTodo, ...uaeTodo].map((submission) => String(submission.id));
const { rows } = await query("select submission_id, form_id, status, error from jotform_submissions where submission_id = any($1)", [ids]);
const byId = new Map([...paTodo, ...afTodo, ...uaeTodo].map((submission) => [String(submission.id), submission]));

for (const row of rows) {
  if (row.status === "processed") results.processed += 1;
  else if (row.status === "unmatched") results.unmatched.push(`${row.submission_id} ${nameOf(byId.get(row.submission_id))}`);
  else if (row.status === "failed") results.failed.push(`${row.submission_id} ${nameOf(byId.get(row.submission_id))}: ${row.error}`);
  else if (row.status === "received") results.stored += 1;
}

await flushActivityLog();

console.log(`\nImported: ${results.processed} applied, ${results.stored} stored for later (UAE), ${results.unmatched.length} unmatched, ${results.failed.length} failed.`);
if (results.unmatched.length) console.log(`Unmatched (in jotform_submissions, status "unmatched"):\n  ${results.unmatched.join("\n  ")}`);
if (results.failed.length) console.log(`Failed (retry with processJotformSubmissions.js --retry-failed):\n  ${results.failed.join("\n  ")}`);

await closeDatabase();
process.exit(0);
