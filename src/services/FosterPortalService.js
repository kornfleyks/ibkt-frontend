import { serverGet, serverPost, serverUpload, serverDelete } from "./MondayService";

// The foster portal's server calls (server/fosterPortal/routes.js). The server
// works out who the foster is from their login.

// The cats assigned to the foster, newest first:
// [{ id, name, status, profile: { id, status, submittedAt, rejectReason } | null }]
// where profile is the newest Kitty Profile sent for the cat (status Pending,
// Applied or Rejected).
export async function getMyFosterCats() {
  const cats = await serverGet("/api/foster-portal/cats");

  return cats.map((cat) => ({ ...cat, profile: cat.profile ? { ...cat.profile, submittedAt: cat.profile.submittedAt ? new Date(cat.profile.submittedAt) : null } : null }));
}

// One cat: { cat: { id, name, status, gender, age }, files: [{ assetId, name,
// kind, sizeBytes, uploadedAt }], counts: { photos, videos, passport, vetReport },
// profile }. The files are the ones sent so far for the next profile.
export function getMyFosterCat(catId) {
  return serverGet(`/api/foster-portal/cats/${catId}`);
}

// kind: photos | videos | passport | vetReport. Resolves to { file }.
export function uploadFosterFile(catId, kind, file) {
  const formData = new FormData();

  formData.append("kind", kind);
  formData.append("file", file);

  return serverUpload(`/api/foster-portal/cats/${catId}/files`, formData);
}

export function deleteFosterFile(catId, assetId) {
  return serverDelete(`/api/foster-portal/cats/${catId}/files/${assetId}`);
}

// Sends the Kitty Profile for review. Resolves to { profile }. A failed check
// rejects with an error whose `details.fields` is { question key: message }.
export function sendFosterProfile(catId, answers) {
  return serverPost(`/api/foster-portal/cats/${catId}/profile`, { answers });
}
