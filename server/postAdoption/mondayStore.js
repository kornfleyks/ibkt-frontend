import { POST_ADOPTION } from "../../src/constants/boards/postAdoption.js";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../src/constants/statuses/postAdoptionStatuses.js";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { mondayDirectRequest } from "../mondayClient.js";
import { statusLabelsOf, toMondayColumnValues, readMondayRecord, createMondayItem, changeMondayRecord } from "../mondayRecords.js";
import { POST_ADOPTION_FIELDS, CREATE_ONLY_FIELDS, BOARD_ID } from "./fields.js";

// Post-adoption records straight from Monday, for when "post_adoption" is
// not in DATABASE_BOARDS. Same interface and record shape as
// databaseStore.js; changes are checked the same way (status labels from
// src/constants/statuses/postAdoptionStatuses.js), see mondayRecords.js.

const STATUS_LABELS = statusLabelsOf(POST_ADOPTION.COLUMNS, POST_ADOPTION_STATUS_OPTIONS);

export function getRecord(id) {
  return readMondayRecord(BOARD_ID, POST_ADOPTION_FIELDS, id);
}

// Through the application's side of the two-way link.
export async function findByApplication(applicationId) {
  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) { column_values(ids: $columnIds) { ... on BoardRelationValue { linked_item_ids } } }
    }`,
    { ids: [String(applicationId)], columnIds: [ACTIVE_APPLICATIONS.COLUMNS.LINKED_POST_ADOPTION_MANAGEMENT] },
  );
  const ids = data.items?.[0]?.column_values?.[0]?.linked_item_ids ?? [];
  const newest = ids.map(Number).sort((a, b) => b - a)[0];

  return newest ? getRecord(newest) : null;
}

export async function createPostAdoption({ name, values, applicationId, catId }) {
  const columnValues = toMondayColumnValues(
    { ...POST_ADOPTION_FIELDS, ...CREATE_ONLY_FIELDS },
    { ...values, linkedApplicationIds: [applicationId], linkedCatIds: catId ? [catId] : [] },
    STATUS_LABELS,
  );

  return getRecord(await createMondayItem(BOARD_ID, name, columnValues));
}

export function updatePostAdoption(id, changes) {
  return changeMondayRecord(BOARD_ID, POST_ADOPTION_FIELDS, id, changes, STATUS_LABELS);
}
