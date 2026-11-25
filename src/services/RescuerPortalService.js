import { serverGet, serverPost, serverUpload } from "./MondayService";

// The rescuer portal's server calls (server/rescuerPortal/routes.js). The
// server works out who the rescuer is from their login.

// { breed: [...], colour: [...], maxBondedCats } - the last is the most cats
// that can be added together.
export function getPortalOptions() {
  return serverGet("/api/rescuer-portal/options");
}

// The rescuer's own cats, newest first:
// [{ id, name, status, addedAt, photoCount, videoCount, documentCount, canAddFiles }]
export async function getMyCats() {
  const cats = await serverGet("/api/rescuer-portal/cats");

  return cats.map((cat) => ({ ...cat, addedAt: cat.addedAt ? new Date(cat.addedAt) : null }));
}

// Creates the cat (Intake, linked to this rescuer) and resolves to { id, name }.
export function addPortalCat(input) {
  return serverPost("/api/rescuer-portal/cats", input);
}

// Creates two or more cats together, linked as a bonded group: `cats` is a
// list of the same input as addPortalCat. Resolves to { cats: [{ id, name }] }
// in the order sent.
export function addPortalCatGroup(cats) {
  return serverPost("/api/rescuer-portal/cat-group", { cats });
}

// kind: photos | videos | medicalDocuments
export function uploadPortalFile(catId, kind, file) {
  const formData = new FormData();

  formData.append("kind", kind);
  formData.append("file", file);

  return serverUpload(`/api/rescuer-portal/cats/${catId}/files`, formData);
}
