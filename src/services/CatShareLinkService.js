import { serverPost } from "./MondayService";

// The shareable Add Cat link (server/catShareLinks/routes.js). Making a
// link needs a sign-in; the other calls are public, so they use fetch
// directly (like RescuerApplicationService.js) and never touch the session.
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// audience: "foster" (the form asks who the foster is) or "rescuer".
// Resolves to { code, expiresAt } (expiresAt as a Date).
export async function createCatShareLink(audience) {
  const link = await serverPost("/api/cat-share-links", { audience });

  return { ...link, expiresAt: new Date(link.expiresAt) };
}

// Emails a link to someone (it expires after 3 days): { fullName, email,
// audience }. Resolves to { ok, email: { status: "sent" | "skipped" | "failed", error? } }.
export function inviteToAddCat(invitation) {
  return serverPost("/api/cat-share-links/invitations", invitation);
}

// The address a person opens to fill in the form.
export function catShareUrl(code) {
  return `${window.location.origin}${import.meta.env.BASE_URL}add-cat/${code}`;
}

async function publicRequest(path, init) {
  const response = await fetch(`${SERVER_URL}${path}`, init);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || "Request failed.");

    error.status = response.status;
    throw error;
  }

  return result;
}

// { expiresAt, audience, breed: [...], colour: [...] }. Throws (status 404)
// when the link has expired or was already used.
export function getCatShareLink(code) {
  return publicRequest(`/api/public/cat-share-links/${encodeURIComponent(code)}`);
}

// Whether this email is one of our fosters: { found, eligible }. Nothing
// else about the foster is ever returned.
export function lookupSharedFoster(code, email) {
  return publicRequest(`/api/public/cat-share-links/${encodeURIComponent(code)}/foster-lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

// Creates the cat; resolves to { id, name }. Uses up the link. On a link
// made for a foster, `input.foster` is { email, firstName?, lastName?,
// phone?: { country, number } } (the details only when the email is not
// one of our fosters).
export function submitSharedCat(code, input) {
  return publicRequest(`/api/public/cat-share-links/${encodeURIComponent(code)}/cats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

// kind: photos | videos | medicalDocuments. Works only for the cat this
// link made, for an hour after it was made.
export function uploadSharedFile(code, kind, file) {
  const formData = new FormData();

  formData.append("kind", kind);
  formData.append("file", file);

  return publicRequest(`/api/public/cat-share-links/${encodeURIComponent(code)}/files`, { method: "POST", body: formData });
}
