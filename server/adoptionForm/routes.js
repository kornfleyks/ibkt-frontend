import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/activeApplicationsStatuses.js";
import { PRE_ADOPTION_FORM_ID } from "../../src/constants/forms/preAdoptionForm.js";
import { ADOPTION_FORMS, SEND_METHODS, adoptionFormLink, suggestedAdoptionForm } from "../../src/constants/forms/adoptionForms.js";
import { requireApplicationAccess } from "../applicationAccess.js";
import { answer, HttpError } from "../httpAnswer.js";
import { getApplication } from "../applications.js";
import { getFormAnswers } from "../preAdoption/answersStore.js";
import { logActivity } from "../activityLog.js";
import { isDatabaseBoard } from "../database/switches.js";
import { actorOf, InputError } from "../database/boardRecords.js";
import { addInvite, listInvites } from "./invitesStore.js";

// "Send Adoption Form" on the application page (docs/send-adoption-form.md):
// the pre-filled link to the second-stage Jotform form (UAE or UK/US), and
// a record of each time it was sent. Until an email service is connected
// the volunteer sends it themselves (copied link or their email app); the
// app only records that they did. Admins and the Case Owner only; sending
// only while the application is Active.
//
//   GET  /api/applications/:id/adoption-form         { suggested, forms, canSend, blockedReason, invites }
//   POST /api/applications/:id/adoption-form/sends   { formKey, method } -> { invite }

const TABLE = "applications";
const BOARD_NAME = "Active Applications";
const SENDABLE_STAGE = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE.ACTIVE_APPLICATION;
const METHOD_LABELS = {
  [SEND_METHODS.COPY_LINK]: "copied the link",
  [SEND_METHODS.EMAIL_CLIENT]: "opened it in their email",
};

async function loadApplication(applicationId) {
  if (!isDatabaseBoard(TABLE)) throw new HttpError(409, "Applications are still kept on Monday on this server.");

  const application = await getApplication(applicationId);

  if (!application) throw new HttpError(404, "Application not found.");

  return application;
}

function blockedReasonOf(application) {
  return application.adoptionStage === SENDABLE_STAGE ? null : `The Adoption Form is sent once the application is "${SENDABLE_STAGE}".`;
}

// What the link is pre-filled with. The saved Pre-Adoption answers (Add
// Application or the Jotform import) give the name and address in parts.
async function applicantOf(application) {
  const saved = (await getFormAnswers(application.id, PRE_ADOPTION_FORM_ID).catch(() => null))?.answers ?? {};

  return {
    applicationId: String(application.id),
    name: application.name,
    fullName: saved.fullName,
    email: application.email,
    phone: application.phone,
    city: application.city,
    country: application.country,
    address: saved.address,
    cat: application.linkedCatName || saved.catsInterestedIn,
  };
}

async function adoptionFormState(applicationId) {
  const application = await loadApplication(applicationId);
  const applicant = await applicantOf(application);

  return {
    suggested: suggestedAdoptionForm(application.country),
    forms: Object.values(ADOPTION_FORMS).map((form) => ({ key: form.key, name: form.name, link: adoptionFormLink(form.key, applicant) })),
    canSend: !blockedReasonOf(application),
    blockedReason: blockedReasonOf(application),
    invites: await listInvites(applicationId),
  };
}

async function recordSend(req) {
  const { formKey, method } = req.body ?? {};
  const form = ADOPTION_FORMS[formKey];

  if (!form) throw new InputError("Choose which Adoption Form to send.");
  if (!Object.values(SEND_METHODS).includes(method)) throw new InputError("Unknown way of sending.");

  const application = await loadApplication(req.params.id);
  const blocked = blockedReasonOf(application);

  if (blocked) throw new HttpError(409, blocked);

  const actor = actorOf(req);
  const link = adoptionFormLink(form.key, await applicantOf(application));
  const invite = await addInvite({ applicationId: application.id, formKey: form.key, formId: form.formId, method, link, sentBy: actor });

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    boardName: BOARD_NAME,
    itemId: String(application.id),
    itemName: application.name,
    // An existing Action Type label (the column is a Monday status).
    actionType: "Updated",
    description: `${actor.name} sent "${form.name}" to ${application.name} (${METHOD_LABELS[method]})`,
    raw: { formKey: form.key, formId: form.formId, method },
  });

  return { invite };
}

export function registerAdoptionFormRoutes(app, { requireAuth }) {
  const allowed = requireApplicationAccess("Adoption Form");
  const base = "/api/applications/:id/adoption-form";

  app.get(base, requireAuth, allowed, (req, res) => answer(res, adoptionFormState(req.params.id), "adoption form"));

  app.post(`${base}/sends`, requireAuth, allowed, (req, res) => answer(res, recordSend(req), "adoption form"));
}
