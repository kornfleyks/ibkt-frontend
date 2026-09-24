import {
  mondayRequest,
  changeMondayColumnValue,
  getColumnSettings,
  serverGet,
  serverPost,
} from "./MondayService";
import { ACTIVE_APPLICATIONS } from "../constants/boards/activeApplications";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../constants/statuses/activeApplicationsStatuses";
import { mapMondayActiveApplication } from "./mappers/ActiveApplicationMapper";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

// Fields an Admin can edit from the Adoptions detail view, and how to
// shape each one for Monday's change_column_value mutation.
export const ADOPTION_EDITABLE_FIELDS = {
  assignedVolunteer: {
    column: ACTIVE_APPLICATIONS.COLUMNS.ASSIGNED_VOLUNTEER,
    type: "text",
  },
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
  internalNotes: {
    column: ACTIVE_APPLICATIONS.COLUMNS.INTERNAL_NOTES,
    type: "long_text",
  },
};

export async function getActiveApplications() {
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
  return changeMondayColumnValue(
    ACTIVE_APPLICATIONS.BOARD_ID,
    applicationId,
    ACTIVE_APPLICATIONS.COLUMNS.LINKED_CAT,
    {
      item_ids: catIds.map(Number),
    },
  );
}

// Linked Cat is a Monday board setting ("allowMultipleItems"), not something
// the item data reveals - a bonded group can only be linked when it's on.
export async function linkedCatAllowsMultiple() {
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
  return changeMondayColumnValue(
    ACTIVE_APPLICATIONS.BOARD_ID,
    applicationId,
    ACTIVE_APPLICATIONS.COLUMNS.MATCH_CONFIDENCE,
    confidence ? { label: confidence } : {},
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
      ? { label: value }
      : config.type === "long_text"
        ? { text: value }
        : value;

  return changeMondayColumnValue(
    ACTIVE_APPLICATIONS.BOARD_ID,
    id,
    config.column,
    payload,
  );
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
