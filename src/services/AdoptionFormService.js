import { serverGet, serverPost } from "./MondayService";

// "Send Adoption Form" (server/adoptionForm/routes.js).
// State: { suggested: { key, reason }, forms: [{ key, name, link }],
//          canSend, blockedReason, invites: [{ id, formKey, formId, method,
//          link, sentBy: { id, name } | null, sentAt }] } (newest first).

export function getAdoptionFormState(applicationId) {
  return serverGet(`/api/applications/${applicationId}/adoption-form`);
}

// Records that the volunteer sent it (method: SEND_METHODS). Answers { invite }.
export function recordAdoptionFormSend(applicationId, { formKey, method }) {
  return serverPost(`/api/applications/${applicationId}/adoption-form/sends`, { formKey, method });
}
