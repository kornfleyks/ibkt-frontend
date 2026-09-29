import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/activeApplicationsStatuses.js";
import { APPLICATION_FIELDS, getApplication } from "../applications.js";
import { changeRecord, logChanges } from "../database/boardRecords.js";
import { isDatabaseBoard } from "../database/switches.js";
import { statusLabelsOf, readMondayRecord, changeMondayRecord } from "../mondayRecords.js";

// Reading the application for a review, and saving an accepted draft, in
// either storage (applications in the database or on Monday). The AI
// fields are writable only here: /api/applications/:id keeps them
// read-only, so only an accepted draft fills them.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";
const BOARD_ID = ACTIVE_APPLICATIONS.BOARD_ID;
const STATUS_LABELS = statusLabelsOf(A, ACTIVE_APPLICATIONS_STATUS_OPTIONS);

const AI_WRITES = {
  aiSummary: { column: A.AI_SUMMARY, write: "longText" },
  aiReview: { column: A.AI_REVIEW, write: "longText" },
  aiConcerns: { column: A.AI_CONCERNS, write: "longText" },
  aiMissingInformation: { column: A.AI_MISSING_INFORMATION, write: "longText" },
  suggestedQuestions: { column: A.SUGGESTED_QUESTIONS, write: "longText" },
  suggestedNextAction: { column: A.SUGGESTED_NEXT_ACTION, write: "longText" },
  aiRecommendation: { column: A.AI_RECOMMENDATION, write: "status" },
  aiRiskScore: { column: A.AI_RISK_SCORE, write: "number", label: "AI Risk Score" },
};

// Everything a review reads or writes, with the AI fields writable.
const REVIEW_FIELDS = { ...APPLICATION_FIELDS, ...AI_WRITES };

// Only what a review needs from Monday (one call), in the app's shape.
const MONDAY_READ_FIELDS = Object.fromEntries(
  [
    "whyAdopt",
    "adoptionMotivation",
    "previousCatExperience",
    "householdInformation",
    "existingPets",
    "workSchedule",
    "country",
    "city",
    "linkedCatName",
    "call1Summary",
    "call1Sentiment",
    "call2Required",
    "call2Summary",
    ...Object.keys(AI_WRITES),
  ].map((key) => [key, REVIEW_FIELDS[key]]),
);

export async function readApplication(applicationId) {
  return isDatabaseBoard(TABLE) ? getApplication(applicationId) : readMondayRecord(BOARD_ID, MONDAY_READ_FIELDS, applicationId);
}

// Saves an accepted draft's values; logged with old and new values like
// any application change. Answers the saved values, or null for an
// unknown application.
export async function saveReviewFields(actor, applicationId, values) {
  const fields = isDatabaseBoard(TABLE) ? REVIEW_FIELDS : MONDAY_READ_FIELDS;
  const result = isDatabaseBoard(TABLE)
    ? await changeRecord(TABLE, fields, applicationId, values)
    : await changeMondayRecord(BOARD_ID, fields, applicationId, values, STATUS_LABELS);

  if (!result) return null;

  logChanges({ actor, table: TABLE, boardName: "Active Applications", fields, before: result.before, after: result.after, keys: Object.keys(values) });

  return Object.fromEntries(Object.keys(values).map((key) => [key, result.after[key]]));
}
