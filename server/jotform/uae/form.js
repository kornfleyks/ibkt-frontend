import { ACTIVE_APPLICATIONS } from "../../../src/constants/boards/activeApplications.js";
import { toPhoneValue } from "../../phoneValue.js";
import { countryCodeOf, phoneOf } from "../preAdoptionFromJotform.js";
import { clean, oneLine, fullNameText, addressText, phoneText, referenceText, lines } from "../secondStage/formValues.js";
import { UAE_FORM_ID, UAE_FORM_COLUMNS, QID } from "./questions.js";

// The "UAE Adoption Form & Agreement" as a second-stage form
// (secondStage/handler.js, docs/jotform-step3.md): its columns
// (questions.js), what it fills only while empty, what it always sets (the
// signed agreement), and its summary lines. It is also the adoption
// agreement: signed = Signed Contract Received; vet costs are paid in AED.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const YES = "Yes";
const AED = "AED";

function fillIfEmpty(raw) {
  const address = raw(QID.ADDRESS) ?? {};
  const countryCode = countryCodeOf(address.country);
  const cell = raw(QID.CELL_PHONE);
  const phone = toPhoneValue(phoneOf(phoneText(cell) ? cell : raw(QID.HOME_PHONE), countryCode));

  return [
    { field: "phone", columnId: A.PHONE, value: !phone.error && phone.value.phone ? phone.value : undefined },
    { field: "country", columnId: A.COUNTRY, value: countryCode ? { countryCode, countryName: countryNames.of(countryCode) } : undefined },
    { field: "city", columnId: A.CITY, value: clean(address.city) || undefined },
    { field: "address", columnId: A.ADDRESS, value: addressText(address) ? { text: addressText(address) } : undefined },
    { field: "referee1", columnId: A.REFEREE_1, value: referenceText(raw(QID.REFERENCE_1_NAME), raw(QID.REFERENCE_1_PHONE)) || undefined },
    { field: "referee2", columnId: A.REFEREE_2, value: referenceText(raw(QID.REFERENCE_2_NAME), raw(QID.REFERENCE_2_PHONE)) || undefined },
    // The adopter reimburses vet costs in dirhams (the label is created on
    // Monday the first time it's sent).
    { field: "paymentRequired", columnId: A.PAYMENT_REQUIRED, value: { labels: [AED] } },
  ];
}

// Signing the form signs the adoption agreement. Only ever set, never cleared.
function alwaysColumns(raw) {
  return clean(String(raw(QID.ADOPTER_SIGNATURE) ?? "")) ? { [A.SIGNED_CONTRACT_RECEIVED]: { label: YES } } : {};
}

function withNote(answer, note) {
  return [clean(answer), oneLine(note)].filter(Boolean).join(" - ");
}

function sections(raw) {
  const outdoor = [clean(raw(QID.CAT_LIVING_AREA)), clean(raw(QID.OUTDOOR_SUPERVISED)) && `supervised outdoors: ${clean(raw(QID.OUTDOOR_SUPERVISED))}`]
    .filter(Boolean)
    .join(", ");
  const rescue = [fullNameText(raw(QID.RESCUE_NAME)), phoneText(raw(QID.RESCUE_PHONE))].filter(Boolean).join(", ");

  return {
    householdInformation: {
      columnId: A.HOUSEHOLD_INFORMATION,
      lines: lines([
        ["About the applicant", raw(QID.ABOUT_YOURSELF)],
        ["Dwelling", [clean(raw(QID.DWELLING_TYPE)), clean(raw(QID.OWNS_HOME)) && `owns it: ${clean(raw(QID.OWNS_HOME))}`].filter(Boolean).join(", ")],
        ["Garden / balcony", withNote(raw(QID.GARDEN_BALCONY), raw(QID.OUTDOOR_PLANS))],
        ["Moving in the next 12 months", withNote(raw(QID.MOVING_SOON), raw(QID.MOVING_PLANS))],
        ["Plans when leaving the UAE", raw(QID.LEAVING_UAE_PLANS)],
        ["Children planned or visiting", raw(QID.CHILDREN_PLANS)],
        ["Chief legal responsibility", raw(QID.CHIEF_RESPONSIBILITY)],
        ["Where the cat will spend its time", outdoor],
        ["Where the cat will eat", raw(QID.WHERE_CAT_EATS)],
        ["Where the cat will sleep", raw(QID.WHERE_CAT_SLEEPS)],
        ["Home visits allowed", raw(QID.HOME_VISITS_ALLOWED)],
      ]),
    },
    existingPets: {
      columnId: A.EXISTING_PETS,
      lines: lines([
        ["How current pets react to new cats", raw(QID.PETS_REACTION)],
        ["Present pets vaccinated", withNote(raw(QID.PETS_VACCINATED), raw(QID.VACCINATION_NOTES))],
        ["Present pets spayed / neutered", withNote(raw(QID.PRESENT_PETS_NEUTERED), raw(QID.PRESENT_PETS_NEUTERED_NOTES))],
        ["Previous pets spayed / neutered", withNote(raw(QID.PREVIOUS_PETS_NEUTERED), raw(QID.PREVIOUS_PETS_NEUTERED_NOTES))],
        ["Current cats declawed", raw(QID.CURRENT_CATS_DECLAWED)],
      ]),
    },
    previousCatExperience: {
      columnId: A.PERVIOUS_CAT_EXPERIENCE,
      lines: lines([
        ["Pets owned in the past 5 years", withNote(raw(QID.PETS_OWNED_5_YEARS), raw(QID.PETS_LIST))],
        ["Owned a cat with their spouse", withNote(raw(QID.SPOUSE_CAT), raw(QID.SPOUSE_CAT_WHEN))],
        ["Ever lost or given away a pet", raw(QID.PET_LOST_OR_GIVEN)],
        ["Adopted before", [clean(raw(QID.ADOPTED_BEFORE)), rescue].filter(Boolean).join(" - ")],
      ]),
    },
    workSchedule: {
      columnId: A.WORK_SCHEDULE,
      lines: lines([
        ["Hours left alone per day", raw(QID.HOURS_ALONE)],
        ["Where a kitten stays when alone", raw(QID.KITTEN_ALONE)],
        ["Holiday plans for the pet", raw(QID.HOLIDAY_PLANS)],
      ]),
    },
  };
}

export const UAE_FORM = {
  formId: UAE_FORM_ID,
  name: "UAE Adoption Form & Agreement",
  columns: UAE_FORM_COLUMNS,
  columnIds: A,
  columnScript: "scripts/createAdoptionFormColumns.js --form uae",
  qid: { applicationId: QID.APPLICATION_ID, email: QID.EMAIL, fullName: QID.FULL_NAME },
  idUploadQids: [QID.EMIRATES_ID_FRONT, QID.EMIRATES_ID_BACK],
  // The second-stage slot, as for the UK/US form (the Application ID
  // columns hold the Pre-Adoption Form that created the application).
  jotformColumns: { formId: A.JOTFORM_ADOPTION_FORM_FORM_ID, submissionId: A.JOTFORM_ADOPTION_FORM_SUBMISSION_ID },
  fillIfEmpty,
  alwaysColumns,
  sections,
};
