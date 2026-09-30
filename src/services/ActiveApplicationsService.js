import {
  mondayRequest,
  changeMondayColumnValue,
  getColumnSettings,
  serverGet,
  serverPost,
  uploadMondayFile,
} from "./MondayService";
import { ACTIVE_APPLICATIONS } from "../constants/boards/activeApplications";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../constants/statuses/activeApplicationsStatuses";
import { mapMondayActiveApplication } from "./mappers/ActiveApplicationMapper";
import { isDatabaseBoard } from "./DatabaseBoardsService";

// Applications come from the database (server/applications.js) when the
// server has the "applications" board switched on, otherwise from Monday as
// before. Both give the same shape (see ActiveApplicationMapper).
const inDatabase = () => isDatabaseBoard("applications");

async function changeApplication(applicationId, changes, mondayChange) {
  if (await inDatabase()) {
    return serverPost(`/api/applications/${applicationId}`, changes);
  }

  return mondayChange();
}

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

// Fields an Admin can edit from the Adoptions detail view, and how to
// shape each one for Monday's change_column_value mutation.
// (Assigned Volunteer isn't one: it changes only through
// assignVolunteer(), where its rules are enforced.)
export const ADOPTION_EDITABLE_FIELDS = {
  priority: {
    column: ACTIVE_APPLICATIONS.COLUMNS.PRIORITY,
    type: "status",
    options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.PRIORITY),
  },
  adoptionStage: {
    column: ACTIVE_APPLICATIONS.COLUMNS.ADOPTION_STAGE,
    type: "status",
    options: Object.values(ADOPTION_STAGE),
  },
  teamDecision: {
    column: ACTIVE_APPLICATIONS.COLUMNS.TEAM_DECISION,
    type: "status",
    options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.TEAM_DECISION),
  },
  caseHealth: {
    column: ACTIVE_APPLICATIONS.COLUMNS.CASE_HEALTH,
    type: "status",
    options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.CASE_HEALTH),
  },
  decisionNotes: {
    column: ACTIVE_APPLICATIONS.COLUMNS.DECISION_NOTES,
    type: "long_text",
  },
  paymentStatus: {
    column: ACTIVE_APPLICATIONS.COLUMNS.PAYMENT_STATUS,
    type: "status",
    options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.PAYMENT_STATUS),
  },
  // "YYYY-MM-DD", or "" to clear.
  paymentDate: {
    column: ACTIVE_APPLICATIONS.COLUMNS.PAYMENT_DATE,
    type: "date",
  },
  // Screening tab.
  call1Completed: { column: ACTIVE_APPLICATIONS.COLUMNS.CALL_1_COMPLETED, type: "status", options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.CALL_1_COMPLETED) },
  call1Date: { column: ACTIVE_APPLICATIONS.COLUMNS.CALL_1_DATE, type: "date" },
  call1Summary: { column: ACTIVE_APPLICATIONS.COLUMNS.CALL_1_SUMMARY, type: "long_text" },
  call1Sentiment: { column: ACTIVE_APPLICATIONS.COLUMNS.CALL_1_SENTIMENT, type: "status", options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.CALL_1_SENTIMENT) },
  call2Required: { column: ACTIVE_APPLICATIONS.COLUMNS.CALL_2_REQUIRED, type: "status", options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.CALL_2_REQUIRED) },
  call2Date: { column: ACTIVE_APPLICATIONS.COLUMNS.CALL_2_DATE, type: "date" },
  call2Summary: { column: ACTIVE_APPLICATIONS.COLUMNS.CALL_2_SUMMARY, type: "long_text" },
  videoSubmitted: { column: ACTIVE_APPLICATIONS.COLUMNS.VIDEO_SUBMITTED, type: "status", options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.VIDEO_SUBMITTED) },
  videoReviewNotes: { column: ACTIVE_APPLICATIONS.COLUMNS.VIDEO_REVIEW_NOTES, type: "long_text" },
  videoApproved: { column: ACTIVE_APPLICATIONS.COLUMNS.VIDEO_APPROVED, type: "status", options: Object.values(ACTIVE_APPLICATIONS_STATUS_OPTIONS.VIDEO_APPROVED) },
  internalNotes: {
    column: ACTIVE_APPLICATIONS.COLUMNS.INTERNAL_NOTES,
    type: "long_text",
  },
};

export async function getActiveApplications() {
  if (await inDatabase()) {
    return serverGet("/api/applications");
  }

  // The BoardRelationValue fragment is required for Linked Cat - without it
  // Monday returns no linked_items and every application looks unmatched.
  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        id
                        name
                        column_values {
                            id
                            type
                            text
                            value

                            ... on BoardRelationValue {
                                display_value
                                linked_items {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapMondayActiveApplication);
}

export async function getActiveApplication(id) {
  if (await inDatabase()) {
    return serverGet(`/api/applications/${id}`).catch((err) => {
      if (/not found/i.test(err.message)) return null;
      throw err;
    });
  }

  const query = `
        query ($boardId: ID!, $itemId: ID!) {
            boards(ids: [$boardId]) {
                items_page(
                    query_params: {
                        ids: [$itemId]
                    }
                ) {
                    items {
                        id
                        name
                        column_values {
                            id
                            type
                            text
                            value

                            ... on BoardRelationValue {
                                display_value
                                linked_items {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    itemId: id,
  });

  const item = data.boards[0].items_page.items[0];

  if (!item) {
    return null;
  }

  return mapMondayActiveApplication(item);
}

// Replaces the whole Linked Cat list - a bonded group is linked in one
// write, and an empty list unlinks every cat.
export async function setApplicationLinkedCats(applicationId, catIds) {
  return changeApplication(applicationId, { linkedCatIds: catIds.map(String) }, () =>
    changeMondayColumnValue(
      ACTIVE_APPLICATIONS.BOARD_ID,
      applicationId,
      ACTIVE_APPLICATIONS.COLUMNS.LINKED_CAT,
      {
        item_ids: catIds.map(Number),
      },
    ),
  );
}

// Linked Cat is a Monday board setting ("allowMultipleItems"), not something
// the item data reveals - a bonded group can only be linked when it's on.
export async function linkedCatAllowsMultiple() {
  if (await inDatabase()) {
    return (await serverGet("/api/applications/linked-cat-multiple")).allowed;
  }

  const [column] = await getColumnSettings(ACTIVE_APPLICATIONS.BOARD_ID, [
    ACTIVE_APPLICATIONS.COLUMNS.LINKED_CAT,
  ]);

  try {
    return JSON.parse(column?.settings_str || "{}").allowMultipleItems !== false;
  } catch {
    return false;
  }
}

// A falsy confidence clears the column (Monday treats `{}` as no label).
export async function setApplicationMatchConfidence(applicationId, confidence) {
  return changeApplication(applicationId, { matchConfidence: confidence || null }, () =>
    changeMondayColumnValue(
      ACTIVE_APPLICATIONS.BOARD_ID,
      applicationId,
      ACTIVE_APPLICATIONS.COLUMNS.MATCH_CONFIDENCE,
      confidence ? { label: confidence } : {},
    ),
  );
}

// Approved applications (shown on Adoptions).
export async function getAdoptions() {
  const applications = await getActiveApplications();

  return applications.filter(
    (application) =>
      application.adoptionStage === ADOPTION_STAGE.APPROVED_APPLICATION,
  );
}

export async function getAdoption(id) {
  return getActiveApplication(id);
}

export async function updateAdoptionField(id, field, value) {
  const config = ADOPTION_EDITABLE_FIELDS[field];

  if (!config) {
    throw new Error(`Field "${field}" is not editable.`);
  }

  const payload =
    config.type === "status"
      ? (value ? { label: value } : {})
      : config.type === "long_text"
        ? { text: value }
        : config.type === "date"
          ? (value ? { date: value } : {})
          : value;
  // The database endpoint takes null for an empty date.
  const stored = config.type === "date" && !value ? null : value;

  return changeApplication(id, { [field]: stored }, () =>
    changeMondayColumnValue(
      ACTIVE_APPLICATIONS.BOARD_ID,
      id,
      config.column,
      payload,
    ),
  );
}

// Add Application: the Pre-Adoption Form's answers (keys of
// constants/forms/preAdoptionForm.js) create an application owned by the
// caller; `photos` then go to Application Photos, each allowed to fail on
// its own (the application exists by then). Resolves { id, name,
// failedPhotos: [file names] }. A duplicate open application for the email
// rejects with err.details.existingId.
export async function createApplication(answers, photos = []) {
  const { id, name } = await serverPost("/api/applications", { answers });

  const results = await Promise.allSettled(
    photos.map((file) => uploadMondayFile(id, ACTIVE_APPLICATIONS.COLUMNS.APPLICATION_PHOTOS, file)),
  );

  const failedPhotos = results.flatMap((result, index) => (result.status === "rejected" ? [photos[index].name] : []));

  return { id, name, failedPhotos };
}

// The Pre-Adoption answers an application was created with (Add
// Application), for Preview: { answers, createdAt }, or null when it has
// none (created before Add Application existed).
export async function getPreAdoptionAnswers(applicationId) {
  try {
    return await serverGet(`/api/applications/${applicationId}/pre-adoption-answers`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// Case Owner is written only through the server endpoint (it enforces the
// CASE_OWNER_* settings); the generic Monday proxy refuses this column.
export async function getAssignableUsers() {
  const { users } = await serverGet("/api/users/assignable");

  return users;
}

// userId === null clears the case owner. Resolves to { id, name } or null.
export async function assignCaseOwner(applicationId, userId) {
  const { caseOwner } = await serverPost(`/api/applications/${applicationId}/case-owner`, { userId });

  return caseOwner;
}

// Active Volunteers who can be an application's Assigned Volunteer.
export async function getVolunteerOptions(applicationId) {
  const { users } = await serverGet(`/api/applications/${applicationId}/volunteer-options`);

  return users;
}

// userId === null clears it. Resolves to { id, name } or null.
export async function assignVolunteer(applicationId, userId) {
  const { assignedVolunteer } = await serverPost(`/api/applications/${applicationId}/assigned-volunteer`, { userId });

  return assignedVolunteer;
}
