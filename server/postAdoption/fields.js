import { POST_ADOPTION } from "../../src/constants/boards/postAdoption.js";
import { CHECK_INS } from "../../src/constants/postAdoptionCheckIns.js";

const C = POST_ADOPTION.COLUMNS;

export const TABLE = "post_adoption";
export const BOARD_ID = POST_ADOPTION.BOARD_ID;
export const BOARD_NAME = "Post-Adoption";

// A post-adoption record's fields, in the boardRecords spec format (read /
// write kinds, see database/boardRecords.js). Both storage implementations
// (databaseStore.js, mondayStore.js) read and write exactly these, so the
// rules and routes never know which one is in use. `write` marks what the
// app may change; the rest is read-only (AI fields, links set on creation).
export const POST_ADOPTION_FIELDS = {
  status: { column: C.POST_ADOPTION_STATUS, write: "status" },
  linkedApplicationId: { column: C.LINKED_ADOPTER, read: "firstId" },
  linkedCatId: { column: C.LINKED_CAT, read: "firstId" },
  linkedCatName: { column: C.LINKED_CAT, read: "firstName" },
  ownerId: { column: C.POST_ADOPTION_OWNER, read: "firstId", write: "links", shownBy: "ownerName", label: "Post-Adoption Owner" },
  ownerName: { column: C.POST_ADOPTION_OWNER, read: "firstName" },
  country: { column: C.COUNTRY },
  city: { column: C.CITY, write: "text" },
  adoptionDate: { column: C.ADOPTION_DATE, write: "date" },
  arrivalDate: { column: C.ARRIVAL_DATE, write: "date" },
  closedDate: { column: C.CLOSED_DATE, write: "date" },
  lastCheckInSent: { column: C.LAST_CHECK_IN_SENT, write: "date" },
  lastResponseReceived: { column: C.LAST_RESPONSE_RECEIVED, write: "date" },
  chaseCount: { column: C.CHASE_COUNT, write: "number" },
  stopChasing: { column: C.STOP_CHASING, read: "checked", write: "checkbox" },
  allCheckInsComplete: { column: C.ALL_REQUIRED_CHECK_INS_COMPLETE, write: "status" },
  escalationRequired: { column: C.ESCALATION_REQUIRED, write: "status" },
  escalationNotes: { column: C.ESCALATION_NOTES, write: "longText" },
  generalUpdate: { column: C.GENERAL_UPDATE, write: "longText" },
  healthUpdate: { column: C.HEALTH_UPDATE, write: "longText" },
  behaviourUpdate: { column: C.BEHAVIOUR_UPDATE, write: "longText" },
  internalNotes: { column: C.INTERNAL_NOTES, write: "longText" },
  aiCheckInSummary: { column: C.AI_CHECK_IN_SUMMARY },
  aiConcernFlag: { column: C.AI_CONCERN_FLAG },
  suggestedNextAction: { column: C.SUGGESTED_NEXT_ACTION },
  ...Object.fromEntries(
    CHECK_INS.flatMap((checkIn) => [
      [checkIn.statusField, { column: checkIn.statusColumn, write: "status" }],
      [checkIn.dueField, { column: checkIn.dueColumn, write: "date" }],
    ]),
  ),
};

// Set only when the record is created (the application and its cat).
export const CREATE_ONLY_FIELDS = {
  linkedApplicationIds: { column: C.LINKED_ADOPTER, write: "links" },
  linkedCatIds: { column: C.LINKED_CAT, write: "links" },
};

export const PHOTOS_COLUMN_ID = C.PHOTOS_VIDEOS_RECEIVED;

export function isWritable(key) {
  return Boolean(POST_ADOPTION_FIELDS[key]?.write);
}
