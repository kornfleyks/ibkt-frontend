import { serverGet, serverPost, serverUpload } from "./MondayService";

// The rescuer portal's server calls (server/rescuerPortal/routes.js). The
// server works out who the rescuer is from their login.

// { breed: [...], colour: [...] }
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

// kind: photos | videos | medicalDocuments
export function uploadPortalFile(catId, kind, file) {
  const formData = new FormData();

  formData.append("kind", kind);
  formData.append("file", file);

  return serverUpload(`/api/rescuer-portal/cats/${catId}/files`, formData);
}
