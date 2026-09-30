import { ACTIVE_APPLICATIONS } from "../../../src/constants/boards/activeApplications.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../../src/constants/statuses/activeApplicationsStatuses.js";
import { PRE_ADOPTION_FORM_ID } from "../../../src/constants/forms/preAdoptionForm.js";
import { isDatabaseBoard } from "../../database/switches.js";
import { createItem, updateItem, getItem, fieldsFromMondayValues } from "../../database/boardStore.js";
import { clearCache } from "../../mondayCache.js";
import { logActivity } from "../../activityLog.js";
import { toApplication, preAdoptionColumnsReady } from "../../preAdoption/toApplication.js";
import { saveFormAnswers, getFormAnswers } from "../../preAdoption/answersStore.js";
import { fromJotform } from "../preAdoptionFromJotform.js";
import { copyUploads } from "../uploads.js";

// Handler for Pre-Adoption Form submissions (docs/jotform-pre-adoption-import.md):
// a new submission creates an application exactly as Add Application does
// (same columns, summaries and Preview answers); an edited one re-applies
// its answers to the application it created. Decisions: no duplicate
// check, Case Owner unassigned, no notification, photos copied to
// Application Photos, an unusable phone or country leaves that column empty.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";
const BOARD_NAME = "Active Applications";
const JOTFORM_ACTOR = { id: "", name: "Jotform" };
function logImport(applicationId, name, created) {
  logActivity({
    actorId: JOTFORM_ACTOR.id,
    actorName: JOTFORM_ACTOR.name,
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    boardName: BOARD_NAME,
    itemId: applicationId,
    itemName: name,
    actionType: created ? "Created" : "Updated",
    description: created
      ? `Jotform created "${name}" on ${BOARD_NAME} from a Pre-Adoption Form submission`
      : `Jotform updated "${name}" on ${BOARD_NAME}: the applicant edited their Pre-Adoption Form`,
  });
}

// submission: a claimed row of jotform_submissions (submissionsStore.js).
// Answers { status: "processed", applicationId } or { status: "unmatched" }.
export async function handlePreAdoption(submission) {
  if (String(submission.formId) !== PRE_ADOPTION_FORM_ID) {
    throw new Error(`Not a Pre-Adoption Form submission (form ${submission.formId}).`);
  }

  if (!isDatabaseBoard(TABLE)) throw new Error("Applications are still kept on Monday on this server.");
  if (!preAdoptionColumnsReady()) throw new Error("The Pre-Adoption columns aren't set up (scripts/createPreAdoptionColumns.js).");

  const { answers, photoUrls } = fromJotform(submission.answers);
  const existingId = submission.applicationId && (await getItem(TABLE, submission.applicationId)) ? submission.applicationId : null;
  // An edit clears answers the applicant removed; a new one just leaves them out.
  const { name, email, columnValues } = toApplication(answers, { lenient: true, clearEmpty: Boolean(existingId) });

  if (!name || !email) {
    // Jotform requires both, so this shouldn't happen - but it would need a person.
    return { status: "unmatched" };
  }

  const jotformColumns = {
    [A.JOTFORM_APPLICATION_FORM_ID]: PRE_ADOPTION_FORM_ID,
    [A.JOTFORM_APPLICATION_SUBMISSION_ID]: String(submission.submissionId),
  };

  let applicationId;
  let previousPhotoUrls = [];

  if (existingId) {
    applicationId = String(existingId);
    previousPhotoUrls = (await getFormAnswers(applicationId, PRE_ADOPTION_FORM_ID))?.answers?.jotformPhotoUrls ?? [];

    await updateItem(TABLE, applicationId, { name, fields: await fieldsFromMondayValues(TABLE, { ...columnValues, ...jotformColumns }) });
  } else {
    const record = await createItem(TABLE, {
      name,
      fields: await fieldsFromMondayValues(TABLE, {
        ...columnValues,
        ...jotformColumns,
        [A.ADOPTION_STAGE]: { label: ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE.NEW_APPLICATION },
      }),
    });

    applicationId = String(record.id);
  }

  // From here on the application exists: nothing may throw, or a retry
  // would create it a second time. Failures are only logged.
  try {
    // Only photos this submission hasn't had copied before (an edit may add some).
    const copied = await copyUploads(applicationId, A.APPLICATION_PHOTOS, photoUrls.filter((url) => !previousPhotoUrls.includes(url)));

    // The answers as converted, for Preview (phone as typed if it didn't convert).
    await saveFormAnswers({
      applicationId,
      formId: PRE_ADOPTION_FORM_ID,
      answers: { ...answers, jotformPhotoUrls: [...previousPhotoUrls, ...copied] },
      createdBy: null,
    });
  } catch (err) {
    console.error(`Jotform import: application ${applicationId} saved, but its photos / Preview answers weren't.`, err);
  }

  clearCache([ACTIVE_APPLICATIONS.BOARD_ID]);
  logImport(applicationId, name, !existingId);

  return { status: "processed", applicationId };
}
