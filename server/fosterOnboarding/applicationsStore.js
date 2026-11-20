import { query } from "../database/db.js";

// The foster_applications table (scripts/databaseSchema.js). App-only: never
// sent to Monday. The same shape as rescuer_applications
// (rescuerOnboarding/applicationsStore.js); hashIp is shared from there.
export { hashIp } from "../rescuerOnboarding/applicationsStore.js";

export async function countRecentFromIp(ipHash, sinceMs) {
  const { rows } = await query("select count(*)::int as n from foster_applications where ip_hash = $1 and submitted_at > $2", [
    ipHash,
    new Date(Date.now() - sinceMs),
  ]);

  return rows[0].n;
}

// { id } of the saved application, or null when this email already has a
// Pending or Approved one (the unique index, so two simultaneous submissions
// cannot both get in).
export async function insertApplication({ firstName, lastName, email, answers, wordingVersion, ipHash }) {
  const { rows } = await query(
    `insert into foster_applications (first_name, last_name, email, answers, wording_version, ip_hash)
     values ($1, $2, $3, $4, $5, $6)
     on conflict do nothing
     returning id`,
    [firstName, lastName, email, JSON.stringify(answers), wordingVersion, ipHash],
  );

  return rows[0] ? { id: String(rows[0].id) } : null;
}

function toApplication(row) {
  return {
    id: String(row.id),
    status: row.status,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    answers: row.answers,
    wordingVersion: row.wording_version,
    submittedAt: row.submitted_at,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    rejectReason: row.reject_reason,
    fosterId: row.foster_id ? String(row.foster_id) : null,
    userId: row.user_id ? String(row.user_id) : null,
  };
}

// Newest first. Without `status`, every application.
export async function listApplications(status) {
  const { rows } = await query(`select * from foster_applications ${status ? "where status = $1" : ""} order by submitted_at desc`, status ? [status] : []);

  return rows.map(toApplication);
}

export async function getApplication(id) {
  if (!/^\d+$/.test(String(id))) return null;

  const { rows } = await query("select * from foster_applications where id = $1", [Number(id)]);

  return rows[0] ? toApplication(rows[0]) : null;
}

// Takes the application for an approval or rejection: true only for the one
// caller that finds it Pending and not already being handled (a stalled
// attempt is picked up again after two minutes). Stops two clicks from both
// creating the foster.
export async function claimApplication(id) {
  const { rowCount } = await query(
    `update foster_applications set processing_at = now()
     where id = $1 and status = 'Pending' and (processing_at is null or processing_at < now() - interval '2 minutes')`,
    [Number(id)],
  );

  return rowCount > 0;
}

export async function releaseApplication(id) {
  await query("update foster_applications set processing_at = null where id = $1", [Number(id)]);
}

// Remembers the Fosters / Users record made so far, so a retry reuses them.
export async function saveProgress(id, { fosterId, userId }) {
  await query("update foster_applications set foster_id = coalesce($2, foster_id), user_id = coalesce($3, user_id) where id = $1", [
    Number(id),
    fosterId ? Number(fosterId) : null,
    userId ? Number(userId) : null,
  ]);
}

export async function markDecided(id, { status, reviewer, rejectReason = null }) {
  await query(
    `update foster_applications
     set status = $2, reviewed_by_id = $3, reviewed_by_name = $4, reviewed_at = now(), reject_reason = $5, processing_at = null
     where id = $1`,
    [Number(id), status, String(reviewer.id), reviewer.name, rejectReason],
  );
}
