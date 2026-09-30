import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { COUNTRIES } from "../../src/constants/countries.js";
import { PRE_ADOPTION_QUESTIONS, OTHER, FRIEND_RELATIVE, NOT_APPLICABLE, isVisible } from "../../src/constants/forms/preAdoptionForm.js";
import { toPhoneValue } from "../phoneValue.js";

// Pre-Adoption Form answers (keys of src/constants/forms/preAdoptionForm.js)
// -> an Active Applications item: { name, columnValues } in Monday's
// column-value format. Every answer has its own column; the grouped
// summary columns (Household Information, Existing Pets, ...) also get
// "Question: answer" lines, because the Overview tab, AI review and
// Matching read those (docs/add-application-form.md). Written for the Add
// Application dialog; a Jotform import can reuse it once it turns QIDs
// into these keys.

const A = ACTIVE_APPLICATIONS.COLUMNS;

// The per-question columns (server/scripts/createPreAdoptionColumns.js).
const OWN_COLUMNS = [
  "HOW_HEARD", "CATS_INTERESTED_IN", "TIME_AT_ADDRESS", "HOME_TENURE", "ACCOMMODATION_TYPE", "PRIVATE_GARDEN",
  "HOUSEHOLD_ACTIVITY_LEVEL", "HOUSEHOLD_MEMBERS", "FAMILY_IN_AGREEMENT", "FAMILY_AGREEMENT_NOTES",
  "PET_OWNER_EXPERIENCE", "CURRENT_PETS", "CURRENT_PETS_STERILISED", "HOURS_ALONE", "HOUSEHOLD_ALLERGIES",
  "ALLERGY_DETAILS", "CHIEF_CARER", "PET_LOST_BEFORE", "AGE_PREFERENCE", "CAT_PREFERENCES",
  "LIFETIME_COMMITMENT", "OUTDOOR_ACCESS", "TYPICAL_DAY", "APPLICATION_PHOTOS", "CONTACT_CONSENT",
];

export class AnswersError extends Error {}

// False until the columns exist and their ids are in the constants file.
export function preAdoptionColumnsReady() {
  return OWN_COLUMNS.every((key) => Boolean(A[key]));
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_CODES = new Set(COUNTRIES.map(([code]) => code));

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Ticked options as text; "Other" carries its explanation, as Jotform's
// "If other, please explain" box sits right under the choice.
function choices(values, otherText) {
  const picked = (Array.isArray(values) ? values : [values]).filter(Boolean);
  const other = clean(otherText);

  const text = picked.map((option) => (option === OTHER && other ? `${OTHER}: ${other}` : option));

  if (other && !picked.includes(OTHER)) text.push(`${OTHER}: ${other}`);

  return text.join(", ");
}

// "Question: answer" lines, skipping empty answers.
function lines(pairs) {
  return pairs
    .filter(([, answer]) => clean(String(answer ?? "")))
    .map(([question, answer]) => `${question}: ${String(answer).trim()}`)
    .join("\n");
}

function addressText({ line1, line2, city, state, postal, country }) {
  const place = [clean(state), clean(postal)].filter(Boolean).join(" ");

  return [line1, line2, city, place, country ? countryNames.of(country) : ""].map(clean).filter(Boolean).join(", ");
}

// Only visible answers count (a hidden question isn't saved, as in Jotform).
export function visibleAnswers(answers) {
  const visible = {};

  for (const question of PRE_ADOPTION_QUESTIONS) {
    if (isVisible(question, answers) && answers[question.key] !== undefined) {
      visible[question.key] = answers[question.key];
    }
  }

  return visible;
}

// Options (the Jotform import):
//   lenient      an unknown address country or an unusable phone leaves that
//                column empty instead of refusing (Jotform already accepted
//                the submission; the answers as typed stay in Preview)
//   clearEmpty   empty answers clear their column (re-applying an edited
//                submission) instead of being left out
export function toApplication(rawAnswers, { lenient = false, clearEmpty = false } = {}) {
  const answers = visibleAnswers(rawAnswers);

  // Jotform's "NA" for this question is "N/A" in the app (a Jotform import
  // would still send "NA").
  if (answers.petLostBefore === "NA") answers.petLostBefore = NOT_APPLICABLE;
  const name = `${clean(answers.fullName?.first)} ${clean(answers.fullName?.last)}`.trim();
  const address = answers.address ?? {};
  const typedCountry = clean(address.country).toUpperCase();
  const country = COUNTRY_CODES.has(typedCountry) ? typedCountry : "";

  if (!country && !lenient) throw new AnswersError("Choose the address country from the list.");

  const typedPhone = toPhoneValue(answers.phone);

  if (typedPhone.error && !lenient) throw new AnswersError(typedPhone.error);

  const phone = typedPhone.error ? { value: { phone: "" } } : typedPhone;

  const email = clean(answers.email);
  const howHeard = answers.howHeard === FRIEND_RELATIVE && clean(answers.friendName)
    ? `${FRIEND_RELATIVE}: ${clean(answers.friendName)}`
    : clean(answers.howHeard);

  const activityLevel = choices(answers.activityLevel, answers.activityLevelOther);
  const petOwnerExperience = choices(answers.petOwnerExperience, answers.petOwnerExperienceOther);
  const adoptionMotivation = choices(answers.adoptionReasons, answers.adoptionReasonsOther);
  const chiefCarer = choices(answers.chiefCarer, answers.chiefCarerOther);
  const hoursAlone = clean(String(answers.hoursAlone ?? ""));

  const status = (label) => (clean(label) ? { label: clean(label) } : undefined);
  const longText = (text) => (clean(text) ? { text: clean(text) } : undefined);
  const text = (value) => clean(value) || undefined;

  const columnValues = {
    [A.EMAIL]: email ? { email, text: email } : undefined,
    [A.COUNTRY]: country ? { countryCode: country, countryName: countryNames.of(country) } : undefined,
    [A.CITY]: text(address.city),
    [A.ADDRESS]: longText(addressText({ ...address, country })),
    [A.PHONE]: phone.value.phone ? phone.value : undefined,
    [A.WHY_ADOPT]: longText(answers.whyAdopt),
    [A.ADOPTION_MOTIVATION]: longText(adoptionMotivation),

    // One column per question.
    [A.HOW_HEARD]: text(howHeard),
    [A.CATS_INTERESTED_IN]: longText(answers.catsInterestedIn),
    [A.TIME_AT_ADDRESS]: text(answers.timeAtAddress),
    [A.HOME_TENURE]: status(answers.homeTenure),
    [A.ACCOMMODATION_TYPE]: status(answers.accommodationType),
    [A.PRIVATE_GARDEN]: status(answers.privateGarden),
    [A.HOUSEHOLD_ACTIVITY_LEVEL]: text(activityLevel),
    [A.HOUSEHOLD_MEMBERS]: longText(answers.householdMembers),
    [A.FAMILY_IN_AGREEMENT]: status(answers.familyInAgreement),
    [A.FAMILY_AGREEMENT_NOTES]: longText(answers.familyAgreementNotes),
    [A.PET_OWNER_EXPERIENCE]: text(petOwnerExperience),
    [A.CURRENT_PETS]: longText(answers.currentPets),
    [A.CURRENT_PETS_STERILISED]: status(answers.currentPetsSterilised),
    [A.HOURS_ALONE]: hoursAlone || undefined,
    [A.HOUSEHOLD_ALLERGIES]: status(answers.allergies),
    [A.ALLERGY_DETAILS]: longText(answers.allergyDetails),
    [A.CHIEF_CARER]: text(chiefCarer),
    [A.PET_LOST_BEFORE]: status(answers.petLostBefore),
    [A.AGE_PREFERENCE]: text(choices(answers.agePreference)),
    [A.CAT_PREFERENCES]: text(choices(answers.catPreferences)),
    [A.LIFETIME_COMMITMENT]: status(answers.lifetimeCommitment),
    [A.OUTDOOR_ACCESS]: status(answers.outdoorAccess),
    [A.TYPICAL_DAY]: longText(answers.typicalDay),
    [A.CONTACT_CONSENT]: text(choices(answers.contactConsent)),

    // The grouped summaries the app already shows (docs/jotform-field-mapping.md, section 3).
    [A.PERVIOUS_CAT_EXPERIENCE]: longText(lines([
      ["Experience as a pet owner", petOwnerExperience],
      ["Pet ever gone missing or killed in a road accident", answers.petLostBefore],
    ])),
    [A.HOUSEHOLD_INFORMATION]: longText(lines([
      ["Rented / owned", answers.homeTenure],
      ["Accommodation", answers.accommodationType],
      ["Private garden", answers.privateGarden],
      ["Lived at this address", answers.timeAtAddress],
      ["People living with the pet", answers.householdMembers],
      ["Whole family in agreement", [answers.familyInAgreement, clean(answers.familyAgreementNotes)].filter(Boolean).join(" - ")],
      ["Allergies in the household", [answers.allergies, clean(answers.allergyDetails)].filter(Boolean).join(" - ")],
      ["Household activity level", activityLevel],
      ["Chief responsibility", chiefCarer],
      ["Allowed outside", answers.outdoorAccess],
    ])),
    [A.EXISTING_PETS]: longText(lines([
      ["Current pets", answers.currentPets],
      ["Current pets sterilised", answers.currentPetsSterilised],
    ])),
    [A.WORK_SCHEDULE]: longText(lines([
      ["Hours left alone per day", hoursAlone],
      ["Typical day", answers.typicalDay],
    ])),
  };

  // Empty answers: nothing to write, or (clearEmpty) clear the column.
  for (const [columnId, value] of Object.entries(columnValues)) {
    if (value !== undefined) continue;

    if (clearEmpty) columnValues[columnId] = null;
    else delete columnValues[columnId];
  }

  return { name, email, columnValues };
}
