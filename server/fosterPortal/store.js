import { query } from "../database/db.js";

// The foster_cat_profiles table (scripts/databaseSchema.js): the Kitty Profiles
// fosters send, until staff apply or reject them (docs/foster-onboarding.md).
// App-only: never sent to Monday. A cat has at most one Pending profile (the
// unique index), so a second send is refused until staff have dealt with the
// first. `files` is the list of files the foster sent ([{ assetId, name, kind,
// sizeBytes }]); the files themselves wait in the cat's Foster Uploads (pending)
// column on Monday.

function toProfile(row) {
  return {
    id: String(row.id),
    catId: String(row.cat_id),
    userId: String(row.user_id),
    fosterId: String(row.foster_id),
    status: row.status,
    answers: row.answers,
    files: row.files ?? [],
    wordingVersion: row.wording_version,
    submittedAt: row.submitted_at,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
    rejectReason: row.reject_reason,
    appliedFields: row.applied_fields ?? [],
  };
}

// The profile that was saved, or null when the cat already has a Pending one.
export async function insertProfile({ catId, userId, fosterId, answers, files, wordingVersion }) {
  const { rows } = await query(
    `insert into foster_cat_profiles (cat_id, user_id, foster_id, answers, files, wording_version)
     values ($1, $2, $3, $4, $5, $6)
     on conflict do nothing
     returning *`,
    [Number(catId), Number(userId), Number(fosterId), JSON.stringify(answers), JSON.stringify(files), wordingVersion],
  );

  return rows[0] ? toProfile(rows[0]) : null;
}

export async function getProfile(id) {
  if (!/^\d+$/.test(String(id))) return null;

  const { rows } = await query("select * from foster_cat_profiles where id = $1", [Number(id)]);

  return rows[0] ? toProfile(rows[0]) : null;
}

// Newest first, for one cat.
export async function listProfilesOfCat(catId) {
  const { rows } = await query("select * from foster_cat_profiles where cat_id = $1 order by submitted_at desc, id desc", [Number(catId)]);

  return rows.map(toProfile);
}

// The newest profile of each of `catIds`: Map catId -> profile.
export async function latestProfiles(catIds) {
  if (!catIds.length) return new Map();

  const { rows } = await query(
    `select distinct on (cat_id) * from foster_cat_profiles where cat_id = any($1::bigint[]) order by cat_id, submitted_at desc, id desc`,
    [catIds.map(Number)],
  );

  return new Map(rows.map((row) => [String(row.cat_id), toProfile(row)]));
}

// Takes a Pending profile for an Apply or a Reject: true only for the one caller
// that finds it Pending and not already being handled (a stalled attempt is
// picked up again after five minutes, as copying files can take a while). Stops
// two clicks from both applying it.
export async function claimProfile(id) {
  const { rowCount } = await query(
    `update foster_cat_profiles set processing_at = now()
     where id = $1 and status = 'Pending' and (processing_at is null or processing_at < now() - interval '5 minutes')`,
    [Number(id)],
  );

  return rowCount > 0;
}

export async function releaseProfile(id) {
  await query("update foster_cat_profiles set processing_at = null where id = $1", [Number(id)]);
}

// `appliedFields`: the cat fields that were changed (their keys).
export async function markApplied(id, { reviewer, appliedFields }) {
  await query(
    `update foster_cat_profiles
     set status = 'Applied', reviewed_by_id = $2, reviewed_by_name = $3, reviewed_at = now(), applied_fields = $4, processing_at = null
     where id = $1`,
    [Number(id), String(reviewer.id), reviewer.name, JSON.stringify(appliedFields)],
  );
}

export async function markRejected(id, { reviewer, reason }) {
  await query(
    `update foster_cat_profiles
     set status = 'Rejected', reviewed_by_id = $2, reviewed_by_name = $3, reviewed_at = now(), reject_reason = $4, processing_at = null
     where id = $1`,
    [Number(id), String(reviewer.id), reviewer.name, reason],
  );
}

// Which of the pending files (by asset id) an earlier, interrupted Apply already
// copied into the cat's own columns: Set of the old asset ids. The copies carry a
// note naming their pending file (see copyNote).
export function copyNote(profileId, pendingAssetId) {
  return `Sent by the foster with Kitty Profile ${profileId} (pending file ${pendingAssetId})`;
}

export async function alreadyCopied(catId, profileId, pendingAssetIds) {
  if (!pendingAssetIds.length) return new Set();

  const { rows } = await query("select note from file_uploads where monday_item_id = $1 and note = any($2::text[])", [
    Number(catId),
    pendingAssetIds.map((assetId) => copyNote(profileId, assetId)),
  ]);
  const notes = new Set(rows.map((row) => row.note));

  return new Set(pendingAssetIds.filter((assetId) => notes.has(copyNote(profileId, assetId))));
}
