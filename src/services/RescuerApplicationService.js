import { serverGet, serverPost } from "./MondayService";

// The public rescuer application form talks to the server directly (no
// sign-in exists yet), like login and registration in AuthService.js.
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export async function submitRescuerApplication(answers, website = "") {
  const response = await fetch(`${SERVER_URL}/api/public/rescuer-applications`, {
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

// ---- Admin (the Rescuers page) ----

function withDates(application) {
  return {
    ...application,
    submittedAt: application.submittedAt ? new Date(application.submittedAt) : null,
    reviewedAt: application.reviewedAt ? new Date(application.reviewedAt) : null,
  };
}

// Newest first; every status.
export async function getRescuerApplications() {
  return (await serverGet("/api/rescuer-applications")).map(withDates);
}

// Resolves to { ok, rescuerId, userId, email: { status, error? } } - email
// says whether the approval email went out (it can fail without undoing the approval).
export function approveRescuerApplication(id) {
  return serverPost(`/api/rescuer-applications/${id}/approve`, {});
}

export function rejectRescuerApplication(id, reason) {
  return serverPost(`/api/rescuer-applications/${id}/reject`, { reason });
}

// "Add Rescuer": { firstName, lastName, email, phone, whatsapp, country, city, contactMethod, notes }.
export function addRescuer(person) {
  return serverPost("/api/admin/rescuers", person);
}

export function resendRescuerLink(userId) {
  return serverPost(`/api/admin/rescuers/${userId}/resend-link`, {});
}
