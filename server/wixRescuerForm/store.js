import crypto from "node:crypto";
import { query } from "../database/db.js";

// The wix_rescuer_submissions table (scripts/databaseSchema.js): what the
// Wix rescuer form sends when someone submits it (wixRescuerForm/routes.js),
// kept as columns. App-only: never sent to Monday.
//
// Two shapes are read, both under "data" (when the automation nests the body).
//
// A collection item (the automation trigger "item added to a collection",
// the collection that stores the form's submissions): data.data holds the
// item's own fields - title (the person's name), email, phone, rescueLocation,
// numberOfCats, submissionId, submittedOn, contactId, and the collection's
// other fields (approve, decline, emailSent), which are kept as answers.
// data.dataCollectionId names the collection and data.id is the item.
//
// A form submission (the trigger "form submitted"):
//   - data.contact: the contact Wix made from the submission (name.first,
//     name.last, email, phone);
//   - data.submissions: the answers as a list of { label, value }, in the
//     form's own wording;
//   - data.submissionId, contactId, formId, formName, submissionTime.
//
// The rest (site information, links, the PDF, empty field placeholders) is
// not kept. For a form submission the name, email and phone come from the
// contact first and from the answers second, and the two rescue questions are
// found by their wording, because Wix gives every field an id with a random
// ending.

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

// One field of a collection item as text: a date object ({ $date }) gives its
// date, any other object its JSON, anything else its text.
function itemText(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return textOf(value.$date ?? JSON.stringify(value));

  return textOf(value);
}

// A collection item (see the top of the file) as the fields the app keeps.
function structureItem(data, item) {
  // submittedOn is set by the form; an item made another way only has _createdDate.
  const submittedOn = item.submittedOn ?? item._createdDate;
  const submittedAt = new Date(submittedOn?.$date ?? submittedOn);

  return {
    submissionId: clean(item.submissionId ?? data.id, 100),
    contactId: clean(item.contactId, 100),
    collectionId: clean(data.dataCollectionId, 255),
    formId: null,
    formName: null,
    submittedAt: Number.isNaN(submittedAt.getTime()) ? null : submittedAt,
    fullName: clean(item.title, 255),
    firstName: null,
    lastName: null,
    email: clean(item.email),
    phone: clean(item.phone, 50),
    rescueLocation: clean(item.rescueLocation),
    catsToRehome: clean(item.numberOfCats, 255),
    answers: Object.entries(item)
      .filter(([key]) => !key.startsWith("_"))
      .slice(0, MAX_ANSWERS)
      .map(([key, value]) => ({ label: key.slice(0, 500), value: itemText(value) })),
  };
}

// The fields the app keeps, from a Wix payload: { submissionId, contactId,
// collectionId, formId, formName, submittedAt, fullName, firstName, lastName,
// email, phone, rescueLocation, catsToRehome, answers }. A field Wix did not
// send is null.
export function structureSubmission(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload ?? {};

  if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) return structureItem(data, data.data);

  const contact = data.contact && typeof data.contact === "object" ? data.contact : {};
  const answers = answersOf(data.submissions);
  const submittedAt = new Date(data.submissionTime);

  return {
    submissionId: clean(data.submissionId, 100),
    contactId: clean(data.contactId ?? contact.contactId, 100),
    collectionId: null,
    formId: clean(data.formId, 100),
    formName: clean(data.formName, 255),
    submittedAt: Number.isNaN(submittedAt.getTime()) ? null : submittedAt,
    fullName: null,
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
  const unreadable = !s.email || (!s.firstName && !s.lastName && !s.fullName);
  const { rows } = await query(
    `insert into wix_rescuer_submissions
       (delivery_key, wix_submission_id, wix_contact_id, collection_id, form_id, form_name, submitted_at,
        full_name, first_name, last_name, email, phone, rescue_location, cats_to_rehome, answers, payload, pack_email_status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     on conflict (delivery_key) do nothing
     returning id`,
    [
      keyOf(payload, s.submissionId),
      s.submissionId,
      s.contactId,
      s.collectionId,
      s.formId,
      s.formName,
      s.submittedAt,
      s.fullName,
      s.firstName,
      s.lastName,
      s.email,
      s.phone,
      s.rescueLocation,
      s.catsToRehome,
      JSON.stringify(s.answers),
      unreadable ? JSON.stringify(payload) : null,
      // A new submission with an email address waits for the rescuer pack email (packEmail.js).
      s.email ? "pending" : null,
    ],
  );

  return rows[0] ? { id: String(rows[0].id) } : null;
}

// One stored submission as its row, or null.
export async function getSubmission(id) {
  const { rows } = await query("select * from wix_rescuer_submissions where id = $1", [Number(id)]);

  return rows[0] ?? null;
}

// Where a request is in the agreement (rescuerAgreement/): "none" (not
// approved), "sent" (link sent, not signed), "expired" (link sent, not
// signed, and it has expired), "signed", or "signedUp" (the person used the
// sign-up link).
function agreementOf(row) {
  if (!row.agreement_id) return { status: "none" };

  const status = row.agreement_signup_used_at ? "signedUp" : row.agreement_signed_at ? "signed" : new Date(row.agreement_expires_at) < new Date() ? "expired" : "sent";

  return {
    status,
    expiresAt: row.agreement_expires_at,
    signedAt: row.agreement_signed_at,
    signedName: row.agreement_signed_name,
    signupExpiresAt: row.agreement_signup_expires_at,
    emailStatus: row.agreement_email_status,
    emailError: row.agreement_email_error,
    emailAt: row.agreement_email_at,
  };
}

// Newest first, for an Admin to see what Wix is sending.
export async function listSubmissions(limit = 50) {
  const { rows } = await query(
    `select s.*,
            a.id as agreement_id, a.expires_at as agreement_expires_at, a.signed_at as agreement_signed_at, a.signed_name as agreement_signed_name,
            a.signup_expires_at as agreement_signup_expires_at, a.signup_used_at as agreement_signup_used_at,
            a.email_status as agreement_email_status, a.email_error as agreement_email_error, a.email_at as agreement_email_at
       from wix_rescuer_submissions s
       left join rescuer_agreements a on a.submission_id = s.id
      order by s.received_at desc
      limit $1`,
    [limit],
  );

  return rows.map((row) => ({
    agreement: agreementOf(row),
    id: String(row.id),
    wixSubmissionId: row.wix_submission_id,
    collectionId: row.collection_id,
    fullName: row.full_name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    rescueLocation: row.rescue_location,
    catsToRehome: row.cats_to_rehome,
    answers: row.answers,
    submittedAt: row.submitted_at,
    receivedAt: row.received_at,
    packEmailStatus: row.pack_email_status,
    packEmailAttempts: row.pack_email_attempts,
    packEmailSentAt: row.pack_email_sent_at,
    packEmailError: row.pack_email_error,
    // Only present when the payload could not be read as expected.
    unreadablePayload: row.payload,
  }));
}
