import crypto from "node:crypto";
import { query } from "../database/db.js";

// The rescuer_agreements table (scripts/databaseSchema.js): one row for each
// Wix rescuer request that Mia approved. It holds the link to the agreement,
// the signature, and the link to sign up to Oriel. Only a hash of each link's
// code is stored. App-only: never sent to Monday. submission_id has no foreign
// key on purpose, so a signed agreement stays when a request row is removed.

const hashCode = (code) => crypto.createHash("sha256").update(String(code)).digest("hex");
const newCode = () => crypto.randomBytes(32).toString("base64url");

function toAgreement(row) {
  return {
    id: String(row.id),
    submissionId: String(row.submission_id),
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    expiresAt: row.expires_at,
    signedAt: row.signed_at,
    signedName: row.signed_name,
    agreementVersion: row.agreement_version,
    pointsSigned: row.points_signed,
    signupExpiresAt: row.signup_expires_at,
    signupUsedAt: row.signup_used_at,
  };
}

// Makes the link to the agreement for a request, or makes a new one when it
// was made before and not signed yet (the old link stops working). Resolves
// to { id, code, expiresAt }, or null when the request already signed.
export async function issueAgreement({ submissionId, email, firstName, lastName, ttlMs, createdById, createdByName }) {
  const code = newCode();
  const expiresAt = new Date(Date.now() + ttlMs);
  const { rows } = await query(
    `insert into rescuer_agreements (submission_id, email, first_name, last_name, token_hash, expires_at, created_by_id, created_by_name)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (submission_id) do update
        set email = excluded.email, first_name = excluded.first_name, last_name = excluded.last_name,
            token_hash = excluded.token_hash, expires_at = excluded.expires_at,
            created_by_id = excluded.created_by_id, created_by_name = excluded.created_by_name
      where rescuer_agreements.signed_at is null
     returning id`,
    [Number(submissionId), email, firstName, lastName, hashCode(code), expiresAt, String(createdById), createdByName],
  );

  return rows[0] ? { id: String(rows[0].id), code, expiresAt } : null;
}

// What the last email about this agreement did: "sent", "skipped" or "failed".
export async function recordEmail(id, { status, error }) {
  await query("update rescuer_agreements set email_status = $2, email_error = $3, email_at = now() where id = $1", [
    Number(id),
    status,
    error ? String(error).slice(0, 500) : null,
  ]);
}

// The agreement the link opens, when it can still be signed, else null.
export async function findOpenAgreement(code) {
  const { rows } = await query("select * from rescuer_agreements where token_hash = $1 and signed_at is null and expires_at > now()", [hashCode(code)]);

  return rows[0] ? toAgreement(rows[0]) : null;
}

// Signs the agreement for the single caller that finds the link open (so two
// simultaneous signatures cannot both succeed), and makes the sign-up link in
// the same statement. Resolves to { agreement, signupCode, signupExpiresAt },
// or null when the link is expired, used, or unknown.
export async function signAgreement(code, { signedName, version, fileHash, points, signupTtlMs }) {
  const signupCode = newCode();
  const signupExpiresAt = new Date(Date.now() + signupTtlMs);
  const { rows } = await query(
    `update rescuer_agreements
        set signed_at = now(), signed_name = $2, agreement_version = $3, agreement_file_hash = $4, points_signed = $5,
            signup_token_hash = $6, signup_expires_at = $7
      where token_hash = $1 and signed_at is null and expires_at > now()
      returning *`,
    [hashCode(code), signedName, version, fileHash, JSON.stringify(points), hashCode(signupCode), signupExpiresAt],
  );

  return rows[0] ? { agreement: toAgreement(rows[0]), signupCode, signupExpiresAt } : null;
}

// A new sign-up link for an agreement that is signed and whose sign-up link
// was not used. Resolves to { code, expiresAt }, or null.
export async function reissueSignup(submissionId, ttlMs) {
  const code = newCode();
  const expiresAt = new Date(Date.now() + ttlMs);
  const { rows } = await query(
    `update rescuer_agreements set signup_token_hash = $2, signup_expires_at = $3
      where submission_id = $1 and signed_at is not null and signup_used_at is null
      returning *`,
    [Number(submissionId), hashCode(code), expiresAt],
  );

  return rows[0] ? { agreement: toAgreement(rows[0]), code, expiresAt } : null;
}

// The agreement of a request, or null.
export async function getBySubmission(submissionId) {
  const { rows } = await query("select * from rescuer_agreements where submission_id = $1", [Number(submissionId)]);

  return rows[0] ? toAgreement(rows[0]) : null;
}

// The agreement whose sign-up link this is, when it can still be used, else null.
export async function findOpenSignup(code) {
  const { rows } = await query("select * from rescuer_agreements where signup_token_hash = $1 and signup_used_at is null and signup_expires_at > now()", [
    hashCode(code),
  ]);

  return rows[0] ? toAgreement(rows[0]) : null;
}

// Takes the sign-up link for one application: resolves to the agreement for
// the single caller that finds it open, null for everyone else.
export async function claimSignup(code) {
  const { rows } = await query(
    "update rescuer_agreements set signup_used_at = now() where signup_token_hash = $1 and signup_used_at is null and signup_expires_at > now() returning *",
    [hashCode(code)],
  );

  return rows[0] ? toAgreement(rows[0]) : null;
}

// Gives the sign-up link back when the application could not be saved.
export async function releaseSignup(id) {
  await query("update rescuer_agreements set signup_used_at = null where id = $1", [Number(id)]);
}
