import crypto from "node:crypto";
import { query } from "../database/db.js";

// The wix_rescuer_submissions table (scripts/databaseSchema.js): what the
// Wix rescuer form sends when someone submits it (wixRescuerForm/routes.js),
// kept as columns. App-only: never sent to Monday.
//
// Wix sends the submission under "data" (when the automation nests the body):
//   - data.contact: the contact Wix made from the submission (name.first,
//     name.last, email, phone);
//   - data.submissions: the answers as a list of { label, value }, in the
//     form's own wording;
//   - data.submissionId, contactId, formId, formName, submissionTime.
// The rest (site information, links, the PDF, empty field placeholders) is
// not kept. The name, email and phone come from the contact first and from
// the answers second. The two rescue questions are found by their wording,
// because Wix gives every field an id with a random ending.

const MAX_TEXT = 2000;
const MAX_ANSWERS = 100;

// One answer value as text: a list is joined, anything else is trimmed.
function textOf(value) {
  const text = Array.isArray(value) ? value.map((part) => String(part ?? "").trim()).filter(Boolean).join(", ") : String(value ?? "").trim();

  return text.slice(0, MAX_TEXT);
}

// The answers as [{ label, value }] with text values, for those that have a label.
function answersOf(submissions) {
  if (!Array.isArray(submissions)) return [];

  return submissions
    .filter((entry) => entry && typeof entry === "object" && typeof entry.label === "string" && entry.label.trim())
    .slice(0, MAX_ANSWERS)
    .map((entry) => ({ label: entry.label.trim().slice(0, 500), value: textOf(entry.value) }));
}

// The first answer whose label matches `pattern`, or null.
function answerFor(answers, pattern) {
  return answers.find((answer) => pattern.test(answer.label) && answer.value)?.value ?? null;
}

const clean = (value, max = 320) => {
  const text = textOf(value).slice(0, max);

  return text || null;
};

// The fields the app keeps, from a Wix payload: { submissionId, contactId,
// formId, formName, submittedAt, firstName, lastName, email, phone,
// rescueLocation, catsToRehome, answers }. A field Wix did not send is null.
export function structureSubmission(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload ?? {};
  const contact = data.contact && typeof data.contact === "object" ? data.contact : {};
  const answers = answersOf(data.submissions);
  const submittedAt = new Date(data.submissionTime);

  return {
    submissionId: clean(data.submissionId, 100),
    contactId: clean(data.contactId ?? contact.contactId, 100),
    formId: clean(data.formId, 100),
    formName: clean(data.formName, 255),
    submittedAt: Number.isNaN(submittedAt.getTime()) ? null : submittedAt,
    firstName: clean(contact.name?.first ?? answerFor(answers, /first\s*name/i), 255),
    lastName: clean(contact.name?.last ?? answerFor(answers, /last\s*name|surname/i), 255),
    email: clean(contact.email ?? answerFor(answers, /e-?mail/i)),
    phone: clean(contact.phone ?? answerFor(answers, /phone|mobile/i), 50),
    rescueLocation: clean(answerFor(answers, /rescue\s+from|community|city/i)),
    catsToRehome: clean(answerFor(answers, /how many cats/i), 255),
    answers,
  };
}

// A stable key for one delivery: the submission's own id, or a hash of the
// body when Wix sent none. The same submission received twice (Wix can repeat
// a request) is stored once.
function keyOf(payload, submissionId) {
  return submissionId ?? crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// Saves a submission as columns. When Wix did not send an email or a name,
// the payload could not be read as expected, so it is kept whole in `payload`
// for an Admin to look at (otherwise it is not kept). Resolves to { id } of
// the new row, or null when this submission was already stored.
export async function insertSubmission(payload) {
  const s = structureSubmission(payload);
  const unreadable = !s.email || (!s.firstName && !s.lastName);
  const { rows } = await query(
    `insert into wix_rescuer_submissions
       (delivery_key, wix_submission_id, wix_contact_id, form_id, form_name, submitted_at,
        first_name, last_name, email, phone, rescue_location, cats_to_rehome, answers, payload)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     on conflict (delivery_key) do nothing
     returning id`,
    [
      keyOf(payload, s.submissionId),
      s.submissionId,
      s.contactId,
      s.formId,
      s.formName,
      s.submittedAt,
      s.firstName,
      s.lastName,
      s.email,
      s.phone,
      s.rescueLocation,
      s.catsToRehome,
      JSON.stringify(s.answers),
      unreadable ? JSON.stringify(payload) : null,
    ],
  );

  return rows[0] ? { id: String(rows[0].id) } : null;
}

// Newest first, for an Admin to see what Wix is sending.
export async function listSubmissions(limit = 50) {
  const { rows } = await query("select * from wix_rescuer_submissions order by received_at desc limit $1", [limit]);

  return rows.map((row) => ({
    id: String(row.id),
    wixSubmissionId: row.wix_submission_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    rescueLocation: row.rescue_location,
    catsToRehome: row.cats_to_rehome,
    answers: row.answers,
    submittedAt: row.submitted_at,
    receivedAt: row.received_at,
    // Only present when the payload could not be read as expected.
    unreadablePayload: row.payload,
  }));
}
