import { ACTIVE_APPLICATIONS } from "../../../src/constants/boards/activeApplications.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../../src/constants/statuses/activeApplicationsStatuses.js";
import { isDatabaseBoard } from "../../database/switches.js";
import { updateItem, fieldsFromMondayValues } from "../../database/boardStore.js";
import { exists } from "../../database/boardRecords.js";
import { getApplication, listApplications, changeApplication } from "../../applications.js";
import { listCats } from "../../cats.js";
import { clearCache } from "../../mondayCache.js";
import { logActivity } from "../../activityLog.js";
import { saveFormAnswers } from "../../preAdoption/answersStore.js";
import { clean, fullNameText } from "../secondStage/formValues.js";
import { singleApplication, notifyAdminsUnmatched } from "../secondStage/handler.js";

// Handler for the Pet Adoption Contract (England & Wales, Scotland;
// docs/jotform-step3.md). A contract is one submission that changes twice:
// a volunteer submits it (contract issued), then the adopter signs it
// through the edit link (an edit). Issued: Final Contract Sent = Yes,
// Payment Required = GBP and Payment Status = Pending when empty, the fee,
// the cat(s) linked by microchip when Linked Cat is empty, then a New or
// Active application moves to Approved (its cats become Adopted). Signed:
// Signed Contract Received = Yes. Found by the adopter's email, then name;
// no match: "unmatched" + Admin bell (not `quiet`).

export const CONTRACT_FORM_IDS = { "203072984903054": "Pet Adoption Contract - England & Wales", "220265883187362": "Pet Adoption Contract - Scotland" };

// Same questions on both forms. Pet 2 (and its fee) only when "Add another pet?" is Yes.
const QID = {
  ADOPTER_NAME: "3",
  ADOPTER_EMAIL: "4",
  ADD_ANOTHER: "55",
  MICROCHIP_1: "9",
  MICROCHIP_2: "64",
  FEE_1_PET: "21",
  FEE_2_PETS: "78",
  SIGNATURE_1_PET: "76",
  SIGNATURE_2_PETS: "23",
};

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";
const BOARD_NAME = "Active Applications";
const JOTFORM_ACTOR = { id: "", name: "Jotform" };
const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
const STATUS = ACTIVE_APPLICATIONS_STATUS_OPTIONS.PAYMENT_STATUS;
const YES = "Yes";
const GBP = "GBP";
const NOT_YET_APPROVED = [STAGES.NEW_APPLICATION, STAGES.ACTIVE_APPLICATION];

const normalized = (value) => String(value ?? "").trim().toLowerCase();
const chip = (value) => String(value ?? "").replace(/\s+/g, "").toLowerCase();
// A real microchip number, not "N/A", "none", "-" or similar (cats with no
// chip show "N/A" too, so those must never match).
const isMicrochip = (value) => /\d{5,}/.test(chip(value));

async function findApplication(submission, { email, name }) {
  if (submission.applicationId && (await exists(TABLE, submission.applicationId))) {
    return { applicationId: String(submission.applicationId), via: "linked" };
  }

  const applications = await listApplications();

  if (email) {
    const match = singleApplication(applications.filter((application) => normalized(application.email) === email));

    if (match) return { applicationId: String(match.id), via: "email" };
  }

  if (name) {
    const match = singleApplication(applications.filter((application) => normalized(application.name) === name));

    if (match) return { applicationId: String(match.id), via: "name" };
  }

  return null;
}

// The ids of the cats whose Microchip Number is on the contract (all of
// them must be found, or none are linked).
async function catsByMicrochip(microchips) {
  if (microchips.length === 0) return [];

  const cats = await listCats();
  const found = microchips.map((number) => cats.find((cat) => isMicrochip(cat.microchipNumber) && chip(cat.microchipNumber) === chip(number)));

  return found.every(Boolean) ? found.map((cat) => String(cat.id)) : [];
}

export async function handleContract(submission, { quiet = false } = {}) {
  const formName = CONTRACT_FORM_IDS[String(submission.formId)];

  if (!formName) throw new Error(`Not an England & Wales or Scotland contract (form ${submission.formId}).`);
  if (!isDatabaseBoard(TABLE)) throw new Error("Applications are still kept on Monday on this server.");
  if (!A.ADOPTION_FEE) throw new Error("The Adoption Fee column isn't set up (scripts/createContractColumns.js).");

  const raw = (qid) => submission.answers?.[qid]?.answer;
  const twoPets = clean(raw(QID.ADD_ANOTHER)) === YES;
  const email = normalized(raw(QID.ADOPTER_EMAIL));
  const name = normalized(fullNameText(raw(QID.ADOPTER_NAME)));
  const match = await findApplication(submission, { email, name });

  if (!match) {
    if (!quiet) await notifyAdminsUnmatched(formName, submission, { name: fullNameText(raw(QID.ADOPTER_NAME)), email });
    return { status: "unmatched" };
  }

  const application = await getApplication(match.applicationId);
  const signed = Boolean(clean(String(raw(twoPets ? QID.SIGNATURE_2_PETS : QID.SIGNATURE_1_PET) ?? "")));
  const fee = clean(raw(twoPets ? QID.FEE_2_PETS : QID.FEE_1_PET));
  const values = {
    [A.FINAL_CONTRACT_SENT]: { label: YES },
    // The first contract's ids stay (a corrected second one is still applied).
    ...(application.jotformContractSubmissionId && application.jotformContractSubmissionId !== String(submission.submissionId)
      ? {}
      : { [A.JOTFORM_CONTRACT_FORM_ID]: String(submission.formId), [A.JOTFORM_CONTRACT_SUBMISSION_ID]: String(submission.submissionId) }),
  };

  if (fee) values[A.ADOPTION_FEE] = fee;
  if (signed) values[A.SIGNED_CONTRACT_RECEIVED] = { label: YES };
  if (!application.paymentRequired) values[A.PAYMENT_REQUIRED] = { labels: [GBP] };
  if (!application.paymentStatus) values[A.PAYMENT_STATUS] = { label: STATUS.PENDING };

  await updateItem(TABLE, match.applicationId, { fields: await fieldsFromMondayValues(TABLE, values) });

  // From here on the application is updated: nothing may throw (a retry
  // would apply it again). Failures are only logged.
  const actions = [];

  try {
    await saveFormAnswers({
      applicationId: match.applicationId,
      formId: String(submission.formId),
      answers: { submissionId: String(submission.submissionId), jotform: submission.answers },
      createdBy: null,
    });

    // The cat(s), then the stage: Approved turns linked cats to Adopted.
    if (application.linkedCatIds.length === 0) {
      const microchips = [raw(QID.MICROCHIP_1), twoPets ? raw(QID.MICROCHIP_2) : null].map(clean).filter(isMicrochip);
      const catIds = await catsByMicrochip(microchips);

      if (catIds.length) {
        await changeApplication(JOTFORM_ACTOR, match.applicationId, { linkedCatIds: catIds });
        actions.push(`linked ${catIds.length === 1 ? "the cat" : `${catIds.length} cats`} by microchip`);
      } else if (microchips.length) {
        actions.push("no cat with that microchip number to link");
      }
    }

    if (NOT_YET_APPROVED.includes(application.adoptionStage)) {
      await changeApplication(JOTFORM_ACTOR, match.applicationId, { adoptionStage: STAGES.APPROVED_APPLICATION });
      actions.push("moved to Approved");
    }
  } catch (err) {
    console.error(`Jotform contract: application ${match.applicationId} updated, but not its cat / stage / saved answers.`, err);
  }

  clearCache([ACTIVE_APPLICATIONS.BOARD_ID]);

  logActivity({
    actorId: JOTFORM_ACTOR.id,
    actorName: JOTFORM_ACTOR.name,
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    boardName: BOARD_NAME,
    itemId: String(application.id),
    itemName: application.name,
    actionType: "Updated",
    description: `Jotform: the ${formName} for "${application.name}" was ${signed ? "signed" : "issued"}${actions.length ? ` (${actions.join(", ")})` : ""}`,
  });

  return { status: "processed", applicationId: match.applicationId };
}
