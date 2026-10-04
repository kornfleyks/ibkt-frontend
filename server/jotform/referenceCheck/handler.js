import { ACTIVE_APPLICATIONS } from "../../../src/constants/boards/activeApplications.js";
import { isDatabaseBoard } from "../../database/switches.js";
import { updateItem, fieldsFromMondayValues } from "../../database/boardStore.js";
import { exists } from "../../database/boardRecords.js";
import { getApplication, listApplications } from "../../applications.js";
import { clearCache } from "../../mondayCache.js";
import { logActivity } from "../../activityLog.js";
import { saveReferenceCheck, takenSlots } from "../../referenceChecks/store.js";
import { clean, fullNameText, phoneText, dateText } from "../secondStage/formValues.js";
import { singleApplication, notifyAdminsUnmatched } from "../secondStage/handler.js";

// Handler for "Reference Check - IBKT" submissions (docs/jotform-step3.md):
// one referee's answers about an applicant. Jotform's link carries no
// application id, so the application is found by the referee's own email
// (one of the application's Referee 1-3), else by the candidate's name.
// Every answer goes to reference_checks (shown on the References tab);
// the application gets References Submitted = Yes and the Jotform
// Reference ID columns. No match: "unmatched" + Admin bell (not `quiet`).

export const REFERENCE_CHECK_FORM_ID = "220642582493458";
const FORM_NAME = "Reference Check - IBKT";

const QID = { CANDIDATE: "4", REFEREE_NAME: "5", REFEREE_PHONE: "6", REFEREE_EMAIL: "16", CRIMINAL_HISTORY: "10", SIGNATURE: "14", DATE: "13" };

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";
const BOARD_NAME = "Active Applications";
const JOTFORM_ACTOR = { id: "", name: "Jotform" };
const YES = "Yes";
const SLOT_FIELDS = { 1: "referee1", 2: "referee2", 3: "referee3" };
const SLOT_COLUMNS = { 1: A.JOTFORM_REFERENCE_1_SUBMISSION_ID, 2: A.JOTFORM_REFERENCE_2_SUBMISSION_ID, 3: A.JOTFORM_REFERENCE_3_SUBMISSION_ID };
// Answers that aren't questions to show (Jotform layout elements).
const NOT_ANSWERS = new Set(["control_head", "control_button", "control_text", "control_pagebreak", "control_divider", "control_image", "control_widget"]);

const normalized = (value) => String(value ?? "").trim().toLowerCase();

// One answer as text, by its Jotform type.
function answerText({ type, answer }) {
  if (answer === undefined || answer === null || answer === "") return "";
  if (type === "control_fullname") return fullNameText(answer);
  if (type === "control_phone") return phoneText(answer);
  if (type === "control_datetime" || type === "control_birthdate") return dateText(answer);
  if (Array.isArray(answer)) return answer.map(clean).filter(Boolean).join(", ");
  if (typeof answer === "object") return Object.values(answer).map((part) => clean(String(part))).filter(Boolean).join(" ");

  return clean(String(answer));
}

// [{ qid, question, answer }] in the form's order, labels as Jotform has them.
function answerList(byQid) {
  return Object.entries(byQid ?? {})
    .filter(([, entry]) => !NOT_ANSWERS.has(entry?.type) && entry?.type !== "control_signature")
    .sort(([, a], [, b]) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map(([qid, entry]) => ({ qid, question: clean(entry.text) || `Question ${qid}`, answer: answerText(entry) }))
    .filter((entry) => entry.answer);
}

// { applicationId, slot, via } or null.
async function findApplication(submission, { refereeEmail, candidateName }) {
  const applications = await listApplications();

  if (submission.applicationId && (await exists(TABLE, submission.applicationId))) {
    const application = applications.find((candidate) => String(candidate.id) === String(submission.applicationId));
    const slot = Object.entries(SLOT_FIELDS).find(([, field]) => refereeEmail && normalized(application?.[field]).includes(refereeEmail))?.[0];

    return { applicationId: String(submission.applicationId), slot: slot ? Number(slot) : null, via: "linked" };
  }

  if (refereeEmail) {
    const listed = applications
      .map((application) => ({ application, slot: Object.entries(SLOT_FIELDS).find(([, field]) => normalized(application[field]).includes(refereeEmail))?.[0] }))
      .filter((entry) => entry.slot);
    const match = singleApplication(listed.map((entry) => entry.application));

    if (match) return { applicationId: String(match.id), slot: Number(listed.find((entry) => entry.application === match).slot), via: "referee email" };
  }

  if (candidateName) {
    const match = singleApplication(applications.filter((application) => normalized(application.name) === candidateName));

    if (match) return { applicationId: String(match.id), slot: null, via: "candidate name" };
  }

  return null;
}

// submission: a claimed row of jotform_submissions (submissionsStore.js).
export async function handleReferenceCheck(submission, { quiet = false } = {}) {
  if (String(submission.formId) !== REFERENCE_CHECK_FORM_ID) {
    throw new Error(`Not a ${FORM_NAME} submission (form ${submission.formId}).`);
  }

  if (!isDatabaseBoard(TABLE)) throw new Error("Applications are still kept on Monday on this server.");

  const byQid = submission.answers ?? {};
  const raw = (qid) => byQid[qid]?.answer;
  const referee = {
    name: fullNameText(raw(QID.REFEREE_NAME)),
    email: clean(raw(QID.REFEREE_EMAIL)),
    phone: phoneText(raw(QID.REFEREE_PHONE)),
  };
  const candidateName = fullNameText(raw(QID.CANDIDATE));
  const match = await findApplication(submission, { refereeEmail: normalized(referee.email), candidateName: normalized(candidateName) });

  if (!match) {
    if (!quiet) await notifyAdminsUnmatched(FORM_NAME, submission, { name: candidateName ? `${referee.name || "a referee"} about ${candidateName}` : referee.name, email: referee.email });
    return { status: "unmatched" };
  }

  // A referee not listed on the application (found by name) takes the first free slot.
  let slot = match.slot;

  if (!slot) {
    const taken = await takenSlots(match.applicationId, submission.submissionId);
    slot = [1, 2, 3].find((candidate) => !taken.has(candidate)) ?? null;
  }

  await saveReferenceCheck({
    submissionId: submission.submissionId,
    applicationId: match.applicationId,
    refereeSlot: slot,
    referee,
    candidateName,
    criminalHistory: answerText({ type: "control_checkbox", answer: raw(QID.CRIMINAL_HISTORY) }),
    answers: answerList(byQid),
    signatureUrl: clean(String(raw(QID.SIGNATURE) ?? "")),
    signedOn: dateText(raw(QID.DATE)),
    submittedAt: submission.jotformCreatedAt,
  });

  const application = await getApplication(match.applicationId);
  const values = { [A.JOTFORM_REFERENCE_FORM_ID]: REFERENCE_CHECK_FORM_ID };

  if (application.referencesSubmitted !== YES) values[A.REFERENCES_SUBMITTED] = { label: YES };
  if (slot) values[SLOT_COLUMNS[slot]] = String(submission.submissionId);

  await updateItem(TABLE, match.applicationId, { fields: await fieldsFromMondayValues(TABLE, values) });
  clearCache([ACTIVE_APPLICATIONS.BOARD_ID]);

  logActivity({
    actorId: JOTFORM_ACTOR.id,
    actorName: JOTFORM_ACTOR.name,
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    boardName: BOARD_NAME,
    itemId: String(application.id),
    itemName: application.name,
    actionType: "Updated",
    description: `Jotform added a reference from ${referee.name || "a referee"} to "${application.name}" (matched by ${match.via})`,
  });

  return { status: "processed", applicationId: match.applicationId };
}
