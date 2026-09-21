import { mondayRequest, changeMondayColumnValue } from "./MondayService";
import { ACTIVE_APPLICATIONS } from "../constants/boards/activeApplications";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../constants/statuses/activeApplicationsStatuses";
import { mapMondayActiveApplication } from "./mappers/ActiveApplicationMapper";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

// Fields an Admin can edit from the Adoptions detail view, and how to
// shape each one for Monday's change_column_value mutation.
export const ADOPTION_EDITABLE_FIELDS = {
  caseOwner: { column: ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER, type: "text" },
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

export async function matchCatToActiveApplication(applicationId, catId) {
  return changeMondayColumnValue(
    ACTIVE_APPLICATIONS.BOARD_ID,
    applicationId,
    ACTIVE_APPLICATIONS.COLUMNS.LINKED_CAT,
    {
      item_ids: [Number(catId)],
    },
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
