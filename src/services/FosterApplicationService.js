import { serverGet, serverPost } from "./MondayService";

// The public foster application form talks to the server directly (no
// sign-in exists yet), like login and registration in AuthService.js.
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export async function submitFosterApplication(answers, website = "") {
  const response = await fetch(`${SERVER_URL}/api/public/foster-applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, website }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || "Request failed.");

    error.fields = result.fields;
    throw error;
  }

  return result;
}

// ---- Admin (the Fosters page) ----

function withDates(application) {
  return {
    ...application,
    submittedAt: application.submittedAt ? new Date(application.submittedAt) : null,
    reviewedAt: application.reviewedAt ? new Date(application.reviewedAt) : null,
  };
}

// Newest first; every status.
export async function getFosterApplications() {
  return (await serverGet("/api/foster-applications")).map(withDates);
}

// Resolves to { ok, fosterId, userId, email: { status, error? } } - email
// says whether the approval email went out (it can fail without undoing the approval).
export function approveFosterApplication(id) {
  return serverPost(`/api/foster-applications/${id}/approve`, {});
}

export function rejectFosterApplication(id, reason) {
  return serverPost(`/api/foster-applications/${id}/reject`, { reason });
}

// "Add Foster": { firstName, lastName, email, phone, country, city, address, notes }.
export function addFoster(person) {
  return serverPost("/api/admin/fosters", person);
}

export function resendFosterLink(userId) {
  return serverPost(`/api/admin/fosters/${userId}/resend-link`, {});
}
