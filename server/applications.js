import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../src/constants/statuses/activeApplicationsStatuses.js";
import { CATS_STATUS_OPTIONS } from "../src/constants/statuses/catsStatuses.js";
import { getCat, changeCat } from "./cats.js";
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
//
// Assigned Volunteer changes only through assignedVolunteer.js.
//
// A stage change also moves the linked cats along (applyStageEffects):
// Approved -> the cats become Adopted; Rejected, or Archived before
// approval -> the cats are unlinked and back to Adoption Ready (an Approved
// or Completed application that is archived keeps its Adopted cats). An
// Approved application can't go back to New or Active. (Matching itself
// sets the cats to Reserved.)

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";
const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
const CAT_STATUS = CATS_STATUS_OPTIONS.STATUS;

// Stages an Approved application may not go back to.
const BEFORE_APPROVAL = [STAGES.NEW_APPLICATION, STAGES.ACTIVE_APPLICATION];
// Once approved, the cats are the adopter's: archiving only files the
// application away. Rejecting always frees them (the adoption isn't happening).
const APPROVED_STAGES = [STAGES.APPROVED_APPLICATION, STAGES.COMPLETED_APPLICATION];

function freesCats(fromStage, toStage) {
  if (toStage === STAGES.REJECTED_APPLICATION) return true;

  return toStage === STAGES.ARCHIVED_APPLICATION && !APPROVED_STAGES.includes(fromStage);
}

export const APPLICATION_FIELDS = {
  email: { column: A.EMAIL },
  phone: { column: A.PHONE },
  country: { column: A.COUNTRY },
  city: { column: A.CITY },
  adoptionStage: { column: A.ADOPTION_STAGE, write: "status" },
  // Read-only here: set through /api/applications/:id/assigned-volunteer
  // (assignedVolunteer.js), where its rules live.
  assignedVolunteerId: { column: A.ASSIGNED_VOLUNTEER, read: "firstId" },
  assignedVolunteer: { column: A.ASSIGNED_VOLUNTEER, read: "firstName" },
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
  // Read-only here: AI fields are written only by accepting an AI draft.
  aiRiskScore: { column: A.AI_RISK_SCORE },
  // Linked Cat holds a whole bonded group when a pair is matched.
  linkedCats: { column: A.LINKED_CAT, read: "items" },
  linkedCatIds: { column: A.LINKED_CAT, read: "ids", write: "links", shownBy: "linkedCatName", label: "Linked Cat" },
  linkedCatId: { column: A.LINKED_CAT, read: "firstId" },
  linkedCatName: { column: A.LINKED_CAT, read: "names" },
  applicationId: { column: A.APPLICATION_ID },
  creationDate: { column: A.CREATION_DATE },
  address: { column: A.ADDRESS },
  // Screening (the Screening tab edits these; AI call reviews can fill the
  // summaries and sentiment when accepted - see aiReview/).
  call1Completed: { column: A.CALL_1_COMPLETED, write: "status" },
  call1Date: { column: A.CALL_1_DATE, write: "date" },
  call1Summary: { column: A.CALL_1_SUMMARY, write: "longText" },
  call1Sentiment: { column: A.CALL_1_SENTIMENT, write: "status" },
  call2Required: { column: A.CALL_2_REQUIRED, write: "status" },
  call2Date: { column: A.CALL_2_DATE, write: "date" },
  call2Summary: { column: A.CALL_2_SUMMARY, write: "longText" },
  videoSubmitted: { column: A.VIDEO_SUBMITTED, write: "status" },
  videoReviewNotes: { column: A.VIDEO_REVIEW_NOTES, write: "longText" },
  videoApproved: { column: A.VIDEO_APPROVED, write: "status" },
  // References tab. Referees are "Name, phone, email" (the Adoption Form
  // import fills them; volunteers can correct them).
  referencesSubmitted: { column: A.REFERENCES_SUBMITTED, write: "status" },
  referee1: { column: A.REFEREE_1, write: "text" },
  referee2: { column: A.REFEREE_2, write: "text" },
  referee3: { column: A.REFEREE_3, write: "text" },
  referenceOutcome: { column: A.REFERENCE_OUTCOME, write: "status" },
  referenceNotes: { column: A.REFERENCE_NOTES, write: "longText" },
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
  // Which Jotform form / submission each part came from. Read-only here:
  // only the Jotform handlers (server/jotform/) set them.
  jotformApplicationFormId: { column: A.JOTFORM_APPLICATION_FORM_ID },
  jotformApplicationSubmissionId: { column: A.JOTFORM_APPLICATION_SUBMISSION_ID },
  jotformAdoptionFormFormId: { column: A.JOTFORM_ADOPTION_FORM_FORM_ID },
  jotformAdoptionFormSubmissionId: { column: A.JOTFORM_ADOPTION_FORM_SUBMISSION_ID },
  jotformReferenceFormId: { column: A.JOTFORM_REFERENCE_FORM_ID },
  jotformReference1SubmissionId: { column: A.JOTFORM_REFERENCE_1_SUBMISSION_ID },
  jotformReference2SubmissionId: { column: A.JOTFORM_REFERENCE_2_SUBMISSION_ID },
  jotformReference3SubmissionId: { column: A.JOTFORM_REFERENCE_3_SUBMISSION_ID },
  jotformContractFormId: { column: A.JOTFORM_CONTRACT_FORM_ID },
  jotformContractSubmissionId: { column: A.JOTFORM_CONTRACT_SUBMISSION_ID },
};

export function listApplications() {
  return readRecords(TABLE, APPLICATION_FIELDS);
}

export function getApplication(id) {
  return readRecord(TABLE, APPLICATION_FIELDS, id);
}

// Saves and logs changes (Case Owner and Assigned Volunteer are refused -
// they have their own endpoints).
export async function changeApplication(actor, id, changes) {
  if ("caseOwnerId" in changes || "caseOwner" in changes) {
    throw new InputError("Case Owner can only be changed through the case owner endpoint.");
  }

  if ("assignedVolunteerId" in changes || "assignedVolunteer" in changes) {
    throw new InputError("Assigned Volunteer can only be changed through the assigned volunteer endpoint.");
  }

  if (changes.linkedCatIds) {
    for (const catId of changes.linkedCatIds) {
      if (!(await exists("cats", catId))) throw new InputError(`Unknown cat ${catId}.`);
    }
  }

  if (changes.adoptionStage && BEFORE_APPROVAL.includes(changes.adoptionStage)) {
    const current = await getApplication(id);

    if (current?.adoptionStage === STAGES.APPROVED_APPLICATION) {
      throw new InputError(`An approved application can't go back to "${changes.adoptionStage}".`);
    }
  }

  const result = await changeRecord(TABLE, APPLICATION_FIELDS, id, changes);

  if (!result) return null;

  logChanges({ actor, table: TABLE, boardName: "Active Applications", fields: APPLICATION_FIELDS, ...result, keys: Object.keys(changes) });

  if (result.before.adoptionStage !== result.after.adoptionStage) {
    return (await applyStageEffects(actor, result.before.adoptionStage, result.after)) ?? result.after;
  }

  return result.after;
}

// Sets each cat that is still linked to `application` to `status`, but only
// from one of `fromStatuses` (a cat changed by hand since, e.g. Archived,
// is left alone). One failure doesn't stop the rest.
async function setLinkedCatsStatus(actor, application, status, fromStatuses) {
  for (const catId of application.linkedCatIds) {
    try {
      const cat = await getCat(catId);

      if (!cat || String(cat.linkedAdopterId ?? "") !== String(application.id)) continue;
      if (cat.status === status || !fromStatuses.includes(cat.status)) continue;

      await changeCat(actor, catId, { status });
    } catch (err) {
      console.error(`Application ${application.id}: couldn't set cat ${catId} to "${status}".`, err);
    }
  }
}

// The application is no longer going ahead: its cats go back to Adoption
// Ready and are unlinked (Match Confidence cleared), as Unmatch does, so
// they can be matched again. Answers the application as saved.
export async function freeLinkedCats(actor, application) {
  if (application.linkedCatIds.length === 0) return application;

  await setLinkedCatsStatus(actor, application, CAT_STATUS.ADOPTION_READY, [CAT_STATUS.RESERVED, CAT_STATUS.ADOPTED]);

  const keys = ["linkedCatIds", "matchConfidence"];
  const result = await changeRecord(TABLE, APPLICATION_FIELDS, application.id, { linkedCatIds: [], matchConfidence: null });

  if (!result) return application;

  logChanges({ actor, table: TABLE, boardName: "Active Applications", fields: APPLICATION_FIELDS, ...result, keys });

  return result.after;
}

// What a new Adoption Stage does to the linked cats. Answers the
// application as saved when it changed it (unlinked), else undefined.
async function applyStageEffects(actor, fromStage, application) {
  try {
    if (application.adoptionStage === STAGES.APPROVED_APPLICATION) {
      await setLinkedCatsStatus(actor, application, CAT_STATUS.ADOPTED, [CAT_STATUS.RESERVED, CAT_STATUS.ADOPTION_READY]);
      return undefined;
    }

    if (freesCats(fromStage, application.adoptionStage)) return await freeLinkedCats(actor, application);
  } catch (err) {
    // The stage is saved either way; the cats can be fixed by hand.
    console.error(`Application ${application.id}: the stage changed, but its cats weren't updated.`, err);
  }

  return undefined;
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
