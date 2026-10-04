import { ACTIVE_APPLICATIONS } from "../../../src/constants/boards/activeApplications.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../../src/constants/statuses/activeApplicationsStatuses.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../../src/constants/statuses/notificationsStatuses.js";
import { isAdminRole } from "../../../src/constants/roles.js";
import { isDatabaseBoard } from "../../database/switches.js";
import { updateItem, fieldsFromMondayValues } from "../../database/boardStore.js";
import { exists } from "../../database/boardRecords.js";
import { getApplication, listApplications, changeApplication } from "../../applications.js";
import { getUserDirectory } from "../../auth.js";
import { clearCache } from "../../mondayCache.js";
import { logActivity } from "../../activityLog.js";
import { createNotification } from "../../notifications.js";
import { saveFormAnswers, getFormAnswers } from "../../preAdoption/answersStore.js";
import { copyUploads } from "../uploads.js";
import { toApplicationChanges, withSection } from "./formValues.js";

// The handler of a second-stage form (the UK/US Adoption Form and
// References, the UAE Adoption Form & Agreement): finds the applicant's
// application and applies every answer to it; never creates one. An
// edited submission re-applies its answers. A New application moves to
// Active (the applicant got this far in Jotform's approvals). No
// application found: "unmatched", and every Active Admin gets a bell
// notification (not with `quiet`, used by the import of older submissions).
// docs/jotform-adoption-form-import.md, docs/jotform-step3.md.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";
const BOARD_NAME = "Active Applications";
const JOTFORM_ACTOR = { id: "", name: "Jotform" };
const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
const CLOSED_STAGES = [STAGES.REJECTED_APPLICATION, STAGES.ARCHIVED_APPLICATION, STAGES.COMPLETED_APPLICATION];

const normalized = (value) => String(value ?? "").trim().toLowerCase();

// The one application among `candidates`: the single open one, else the
// single one there is. null when none or it's ambiguous.
export function singleApplication(candidates) {
  const open = candidates.filter((application) => !CLOSED_STAGES.includes(application.adoptionStage));

  if (open.length === 1) return open[0];
  if (open.length === 0 && candidates.length === 1) return candidates[0];

  return null;
}

// { applicationId, via } or null. Order: already linked (an edit), the
// hidden id from the Send Adoption Form link, email, exact full name.
async function findApplication(submission, { applicationIdHint, email, name }) {
  if (submission.applicationId && (await exists(TABLE, submission.applicationId))) {
    return { applicationId: String(submission.applicationId), via: "linked" };
  }

  if (applicationIdHint && (await exists(TABLE, applicationIdHint))) return { applicationId: applicationIdHint, via: "link" };

  const applications = await listApplications();

  if (email) {
    const match = singleApplication(applications.filter((application) => normalized(application.email) === normalized(email)));

    if (match) return { applicationId: String(match.id), via: "email" };
  }

  if (name) {
    const match = singleApplication(applications.filter((application) => normalized(application.name) === normalized(name)));

    if (match) return { applicationId: String(match.id), via: "name" };
  }

  return null;
}

export async function notifyAdminsUnmatched(formName, submission, { name, email }) {
  const admins = (await getUserDirectory()).filter((user) => isAdminRole(user.role) && user.accountStatus === "Active");
  const who = [name, email && `<${email}>`].filter(Boolean).join(" ") || "someone";

  for (const admin of admins) {
    createNotification({
      recipientId: admin.id,
      type: NOTIFICATIONS_STATUS_OPTIONS.TYPE.UNMATCHED_SUBMISSION,
      message: `No application found for the ${formName} from ${who} (submission ${submission.submissionId})`,
      actor: JOTFORM_ACTOR,
      target: { boardId: "", itemId: "", name: formName },
      link: "/settings",
    });
  }
}

export function makeSecondStageHandler(form) {
  const heading = (submissionId) => `From "${form.name}" (submission ${submissionId}):`;

  // False until every column exists and its id is in the constants file.
  const columnsReady = () => form.columns.every((column) => Boolean(form.columnIds[column.key]));

  // The application's columns to write: every per-question column, the
  // fill-if-empty ones that are still empty, the summary sections, and the
  // Jotform ID columns.
  function columnValuesFor(application, submission, changes) {
    const values = { ...changes.ownColumns };

    for (const { field, columnId, value } of changes.fillIfEmpty) {
      if (!String(application[field] ?? "").trim()) values[columnId] = value;
    }

    for (const [field, { columnId, lines }] of Object.entries(changes.sections)) {
      const current = String(application[field] ?? "");
      const next = withSection(current, heading(submission.submissionId), lines);

      if (next !== current.trim()) values[columnId] = next ? { text: next } : null;
    }

    values[form.jotformColumns.formId] = form.formId;
    values[form.jotformColumns.submissionId] = String(submission.submissionId);

    return values;
  }

  function logImport({ application, edited, via, emailDiffers }) {
    const how = { linked: "", link: " (matched by the Adoption Form link)", email: " (matched by email)", name: " (matched by name)" }[via];
    const note = emailDiffers ? `; the form's email differs from the application's` : "";

    logActivity({
      actorId: JOTFORM_ACTOR.id,
      actorName: JOTFORM_ACTOR.name,
      boardId: ACTIVE_APPLICATIONS.BOARD_ID,
      boardName: BOARD_NAME,
      itemId: String(application.id),
      itemName: application.name,
      actionType: "Updated",
      description: edited
        ? `Jotform updated "${application.name}": the applicant edited their ${form.name}${note}`
        : `Jotform added the ${form.name} to "${application.name}"${how}${note}`,
    });
  }

  // submission: a claimed row of jotform_submissions (submissionsStore.js).
  // Answers { status: "processed", applicationId } or { status: "unmatched" }.
  async function handle(submission, { quiet = false } = {}) {
    if (String(submission.formId) !== form.formId) {
      throw new Error(`Not a ${form.name} submission (form ${submission.formId}).`);
    }

    if (!isDatabaseBoard(TABLE)) throw new Error("Applications are still kept on Monday on this server.");
    if (!columnsReady()) throw new Error(`The ${form.name} columns aren't set up (${form.columnScript}).`);

    const edited = Boolean(submission.applicationId);
    const changes = toApplicationChanges(form, submission.answers, { clearEmpty: edited });
    const match = await findApplication(submission, changes);

    if (!match) {
      if (!quiet) await notifyAdminsUnmatched(form.name, submission, changes);
      return { status: "unmatched" };
    }

    const application = await getApplication(match.applicationId);
    const values = columnValuesFor(application, submission, changes);

    await updateItem(TABLE, match.applicationId, { fields: await fieldsFromMondayValues(TABLE, values) });

    // From here on the application is updated: nothing may throw, or a retry
    // would apply it again. Failures are only logged.
    try {
      const saved = await getFormAnswers(match.applicationId, form.formId);
      const previousUrls = saved?.answers?.copiedIdDocumentUrls ?? [];
      const copied = await copyUploads(match.applicationId, A.AF_ID_DOCUMENTS, changes.idDocumentUrls.filter((url) => !previousUrls.includes(url)));

      // The submission's answers as Jotform sent them, and which ID files were
      // copied (so an edit only copies new ones).
      await saveFormAnswers({
        applicationId: match.applicationId,
        formId: form.formId,
        answers: { submissionId: String(submission.submissionId), jotform: submission.answers, copiedIdDocumentUrls: [...previousUrls, ...copied] },
        createdBy: null,
      });
    } catch (err) {
      console.error(`Jotform import: application ${match.applicationId} updated, but its ID files / saved answers weren't.`, err);
    }

    // The milestone: Jotform sent this form, so screening is done. Only New
    // moves on; any other stage is left as a volunteer set it.
    if (application.adoptionStage === STAGES.NEW_APPLICATION) {
      await changeApplication(JOTFORM_ACTOR, match.applicationId, { adoptionStage: STAGES.ACTIVE_APPLICATION }).catch((err) =>
        console.error(`Jotform import: application ${match.applicationId} updated, but not moved to Active.`, err.message),
      );
    }

    clearCache([ACTIVE_APPLICATIONS.BOARD_ID]);

    const emailDiffers = Boolean(changes.email && application.email && normalized(changes.email) !== normalized(application.email));

    logImport({ application, edited, via: match.via, emailDiffers });

    return { status: "processed", applicationId: match.applicationId };
  }

  return { handle, columnsReady };
}
