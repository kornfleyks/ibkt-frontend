import { serverGet, serverPost } from "./MondayService";

// Staff review of the Kitty Profiles fosters send (server/fosterPortal/review.js).

const base = (catId) => `/api/cats/${catId}/foster-profiles`;

// Newest first: [{ id, status (Pending, Applied, Rejected), fosterName,
// submittedAt, reviewedByName, reviewedAt, rejectReason, appliedFields, answers,
// files: [{ assetId, name, kind, sizeBytes, url }] }]. A waiting profile's files
// have a link; an applied profile's files are the cat's own now (no link).
export async function getFosterProfiles(catId) {
  const { profiles } = await serverGet(base(catId));

  return profiles.map((profile) => ({
    ...profile,
    submittedAt: profile.submittedAt ? new Date(profile.submittedAt) : null,
    reviewedAt: profile.reviewedAt ? new Date(profile.reviewedAt) : null,
  }));
}

// What Apply would change: [{ key, label, kind: "select" | "text", options?,
// current, proposed, defaultApply, tooLong }].
export async function getFosterProposal(catId, profileId) {
  const { fields } = await serverGet(`${base(catId)}/${profileId}/proposal`);

  return fields;
}

// fields: { key: value } of the cat fields to change, files: whether to move the
// foster's files to the cat. Resolves to { ok, applied: [keys], files: count }.
export function applyFosterProfile(catId, profileId, fields, files = true) {
  return serverPost(`${base(catId)}/${profileId}/apply`, { fields, files });
}

export function rejectFosterProfile(catId, profileId, reason) {
  return serverPost(`${base(catId)}/${profileId}/reject`, { reason });
}
