import { serverGet, serverPost } from "./MondayService";

// The Rescuer Agreement (server/rescuerAgreement/routes.js). The calls for the
// person signing are public, so they use fetch directly (like
// CatShareLinkService.js) and never touch the session. The Admin calls are
// for the Rescuers page.
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

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

// The address of the agreement PDF.
export function agreementFileUrl(file) {
  return `${import.meta.env.BASE_URL}${file}`;
}

// { firstName, version, date, file, points: [{ id, text }], expiresAt }. Throws
// (status 404) when the link has expired or was already used.
export function getAgreement(code) {
  return publicRequest(`/api/public/rescuer-agreements/${encodeURIComponent(code)}`);
}

// Signs: { typedName, points: [ids ticked] }. Resolves to { ok, signupCode },
// the code that opens the sign-up page.
export function signAgreement(code, { typedName, points }) {
  return publicRequest(`/api/public/rescuer-agreements/${encodeURIComponent(code)}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ typedName, points }),
  });
}

// { firstName, lastName, email } of a sign-up link. Throws (status 404) when
// the link has expired or was already used.
export function getSignup(code) {
  return publicRequest(`/api/public/rescuer-agreements/signup/${encodeURIComponent(code)}`);
}

// ---- Admin (the Rescuers page) ----

function withDates(request) {
  const { agreement } = request;

  return {
    ...request,
    receivedAt: request.receivedAt ? new Date(request.receivedAt) : null,
    packEmailSentAt: request.packEmailSentAt ? new Date(request.packEmailSentAt) : null,
    agreement: {
      ...agreement,
      expiresAt: agreement.expiresAt ? new Date(agreement.expiresAt) : null,
      signedAt: agreement.signedAt ? new Date(agreement.signedAt) : null,
      emailAt: agreement.emailAt ? new Date(agreement.emailAt) : null,
    },
  };
}

// The rescuer requests that came from Wix, newest first. Each has `agreement`:
// { status: "none" | "sent" | "expired" | "signed" | "signedUp", ... }.
export async function getWixRequests() {
  return (await serverGet("/api/wix-rescuer-submissions")).submissions.map(withDates);
}

// Approves a request: makes the agreement link and emails it. Resolves to
// { ok, expiresAt, email: { status, error? } }.
export function approveWixRequest(id) {
  return serverPost(`/api/wix-rescuer-submissions/${id}/agreement`, {});
}

// A new sign-up link, emailed, for a person who signed and has not signed up.
export function resendSignupLink(id) {
  return serverPost(`/api/wix-rescuer-submissions/${id}/signup-link`, {});
}
