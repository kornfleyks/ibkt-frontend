import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { isDatabaseBoard } from "./database/switches.js";
import { query } from "./database/db.js";
import { readRecords, readRecord, changeRecord, logChanges, actorOf, send, exists, InputError } from "./database/boardRecords.js";

// Applications (and Adoptions, the approved ones) kept in the database
// ("applications" in DATABASE_BOARDS; database-first plan 4.5/4.6). Same
// records as src/services/mappers/ActiveApplicationMapper.js makes from
// Monday, same access as before. Case Owner still changes only through
// /api/applications/:id/case-owner (caseOwner.js), where its rules live.
// Linked Cat is a two-way link: the store keeps each cat's Linked Adopter
// in step, and only the application's side is sent to Monday.
//
//   GET  /api/applications                 all applications
//   GET  /api/applications/linked-cat-multiple   whether Linked Cat takes several cats
//   GET  /api/applications/:id
//   POST /api/applications/:id             { field: value, ... } (see writable fields)

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";

export const APPLICATION_FIELDS = {
  email: { column: A.EMAIL },
  phone: { column: A.PHONE },
  country: { column: A.COUNTRY },
  city: { column: A.CITY },
  adoptionStage: { column: A.ADOPTION_STAGE, write: "status" },
  assignedVolunteer: { column: A.ASSIGNED_VOLUNTEER, write: "text" },
  caseOwnerId: { column: A.CASE_OWNER, read: "firstId" },
  caseOwner: { column: A.CASE_OWNER, read: "firstName" },
  priority: { column: A.PRIORITY, write: "status" },
  aiRecommendation: { column: A.AI_RECOMMENDATION },
  caseHealth: { column: A.CASE_HEALTH, write: "status" },
  whyAdopt: { column: A.WHY_ADOPT },
  previousCatExperience: { column: A.PERVIOUS_CAT_EXPERIENCE },
  householdInformation: { column: A.HOUSEHOLD_INFORMATION },
  existingPets: { column: A.EXISTING_PETS },
  workSchedule: { column: A.WORK_SCHEDULE },
  adoptionMotivation: { column: A.ADOPTION_MOTIVATION },
  aiReview: { column: A.AI_REVIEW },
  aiConcerns: { column: A.AI_CONCERNS },
  suggestedQuestions: { column: A.SUGGESTED_QUESTIONS },
  aiSummary: { column: A.AI_SUMMARY },
  aiMissingInformation: { column: A.AI_MISSING_INFORMATION },
  suggestedNextAction: { column: A.SUGGESTED_NEXT_ACTION },
  // Linked Cat holds a whole bonded group when a pair is matched.
  linkedCats: { column: A.LINKED_CAT, read: "items" },
  linkedCatIds: { column: A.LINKED_CAT, read: "ids", write: "links", shownBy: "linkedCatName", label: "Linked Cat" },
  linkedCatId: { column: A.LINKED_CAT, read: "firstId" },
  linkedCatName: { column: A.LINKED_CAT, read: "names" },
  applicationId: { column: A.APPLICATION_ID },
  creationDate: { column: A.CREATION_DATE },
  address: { column: A.ADDRESS },
  call1Completed: { column: A.CALL_1_COMPLETED },
  call1Summary: { column: A.CALL_1_SUMMARY },
  call1Sentiment: { column: A.CALL_1_SENTIMENT },
  call2Required: { column: A.CALL_2_REQUIRED },
  call2Summary: { column: A.CALL_2_SUMMARY },
  videoSubmitted: { column: A.VIDEO_SUBMITTED },
  videoReviewNotes: { column: A.VIDEO_REVIEW_NOTES },
  videoApproved: { column: A.VIDEO_APPROVED },
  referencesSubmitted: { column: A.REFERENCES_SUBMITTED },
  referee1: { column: A.REFEREE_1 },
  referee2: { column: A.REFEREE_2 },
  referenceOutcome: { column: A.REFERENCE_OUTCOME },
  referenceNotes: { column: A.REFERENCE_NOTES },
  matchConfidence: { column: A.MATCH_CONFIDENCE, write: "status" },
  teamDecision: { column: A.TEAM_DECISION, write: "status" },
  decisionNotes: { column: A.DECISION_NOTES, write: "longText" },
  // Set to "Yes" when a matching contract file is uploaded (contracts.js).
  draftContractGenerated: { column: A.DRAFT_CONTRACT_GENERATED, write: "status" },
  finalContractSent: { column: A.FINAL_CONTRACT_SENT, write: "status" },
  signedContractReceived: { column: A.SIGNED_CONTRACT_RECEIVED, write: "status" },
  paymentRequired: { column: A.PAYMENT_REQUIRED },
  paymentStatus: { column: A.PAYMENT_STATUS, write: "status" },
  paymentDate: { column: A.PAYMENT_DATE, write: "date" },
  internalNotes: { column: A.INTERNAL_NOTES, write: "longText" },
};

export function listApplications() {
  return readRecords(TABLE, APPLICATION_FIELDS);
}

export function getApplication(id) {
  return readRecord(TABLE, APPLICATION_FIELDS, id);
}

// Saves and logs changes (the case owner is refused - it has its own endpoint).
export async function changeApplication(actor, id, changes) {
  if ("caseOwnerId" in changes || "caseOwner" in changes) {
    throw new InputError("Case Owner can only be changed through the case owner endpoint.");
  }

  if (changes.linkedCatIds) {
    for (const catId of changes.linkedCatIds) {
      if (!(await exists("cats", catId))) throw new InputError(`Unknown cat ${catId}.`);
    }
  }

  const result = await changeRecord(TABLE, APPLICATION_FIELDS, id, changes);

  if (!result) return null;

  logChanges({ actor, table: TABLE, boardName: "Active Applications", fields: APPLICATION_FIELDS, ...result, keys: Object.keys(changes) });

  return result.after;
}

// Monday's "allow multiple items" setting of Linked Cat (kept in
// monday_columns by the schema script). Missing = allowed, as on Monday.
async function linkedCatAllowsMultiple() {
  const { rows } = await query("select settings from monday_columns where board_id = $1 and column_id = $2", [
    ACTIVE_APPLICATIONS.BOARD_ID,
    A.LINKED_CAT,
  ]);

  return rows[0]?.settings?.allowMultipleItems !== false;
}

export function registerApplicationRoutes(app, { requireAuth }) {
  const onlyInDatabase = (req, res, next) =>
    isDatabaseBoard(TABLE) ? next() : res.status(409).json({ error: "Applications are still kept on Monday on this server." });

  app.get("/api/applications", requireAuth, onlyInDatabase, (req, res) => send(res, listApplications(), "applications request"));

  app.get("/api/applications/linked-cat-multiple", requireAuth, onlyInDatabase, (req, res) =>
    send(res, linkedCatAllowsMultiple().then((allowed) => ({ allowed })), "applications request"),
  );

  app.get("/api/applications/:id", requireAuth, onlyInDatabase, (req, res) => send(res, getApplication(req.params.id), "applications request"));

  app.post("/api/applications/:id", requireAuth, onlyInDatabase, (req, res) =>
    send(res, changeApplication(actorOf(req), req.params.id, req.body ?? {}), "applications request"),
  );
}
