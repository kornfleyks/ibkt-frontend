import { ACTIVE_APPLICATIONS } from "../../../src/constants/boards/activeApplications.js";
import { toPhoneValue } from "../../phoneValue.js";
import { countryCodeOf, phoneOf } from "../preAdoptionFromJotform.js";
import { clean, oneLine, fullNameText, addressText, phoneText, referenceText, lines } from "../secondStage/formValues.js";
import { ADOPTION_REFERENCES_FORM_ID, ADOPTION_FORM_COLUMNS, QID } from "./questions.js";

// The UK/US "Adoption Form and References" as a second-stage form
// (secondStage/handler.js): its columns (questions.js), the application
// fields it fills only while empty, and its summary lines.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

// Phone / country / city / address and Referees 1-2, filled only while empty
// on the application (a volunteer's or the Pre-Adoption Form's value wins).
function fillIfEmpty(raw) {
  const address = raw(QID.ADDRESS) ?? {};
  const countryCode = countryCodeOf(address.country);
  const mobile = raw(QID.MOBILE_PHONE);
  const phone = toPhoneValue(phoneOf(phoneText(mobile) ? mobile : raw(QID.HOME_PHONE), countryCode));

  return [
    { field: "phone", columnId: A.PHONE, value: !phone.error && phone.value.phone ? phone.value : undefined },
    { field: "country", columnId: A.COUNTRY, value: countryCode ? { countryCode, countryName: countryNames.of(countryCode) } : undefined },
    { field: "city", columnId: A.CITY, value: clean(address.city) || undefined },
    { field: "address", columnId: A.ADDRESS, value: addressText(address) ? { text: addressText(address) } : undefined },
    {
      field: "referee1",
      columnId: A.REFEREE_1,
      value: referenceText(raw(QID.REFERENCE_1_NAME), raw(QID.REFERENCE_1_PHONE), raw(QID.REFERENCE_1_EMAIL)) || undefined,
    },
    {
      field: "referee2",
      columnId: A.REFEREE_2,
      value: referenceText(raw(QID.REFERENCE_2_NAME), raw(QID.REFERENCE_2_PHONE), raw(QID.REFERENCE_2_EMAIL)) || undefined,
    },
  ];
}

// Lines for the summary columns the Overview tab, AI review and Matching read.
function sections(raw) {
  const outdoor = [clean(raw(QID.CAT_LIVING_AREA)), clean(raw(QID.OUTDOOR_SUPERVISED)) && `supervised outdoors: ${clean(raw(QID.OUTDOOR_SUPERVISED))}`]
    .filter(Boolean)
    .join(", ");
  const rescue = [fullNameText(raw(QID.RESCUE_NAME)), phoneText(raw(QID.RESCUE_PHONE))].filter(Boolean).join(", ");

  return {
    householdInformation: {
      columnId: A.HOUSEHOLD_INFORMATION,
      lines: lines([
        ["Chief responsibility", raw(QID.CHIEF_RESPONSIBILITY)],
        ["Where the cat will spend its time", outdoor],
        ["Where the cat will eat", raw(QID.WHERE_CAT_EATS)],
        ["Where the cat will sleep", raw(QID.WHERE_CAT_SLEEPS)],
        ["Home visits allowed", raw(QID.HOME_VISITS_ALLOWED)],
      ]),
    },
    existingPets: {
      columnId: A.EXISTING_PETS,
      lines: lines([
        ["Present pets vaccinated", [clean(raw(QID.PETS_VACCINATED)), oneLine(raw(QID.VACCINATION_NOTES))].filter(Boolean).join(" - ")],
        ["Current cats declawed", raw(QID.CURRENT_CATS_DECLAWED)],
      ]),
    },
    previousCatExperience: {
      columnId: A.PERVIOUS_CAT_EXPERIENCE,
      lines: lines([["Adopted before", [clean(raw(QID.ADOPTED_BEFORE)), rescue].filter(Boolean).join(" - ")]]),
    },
    workSchedule: {
      columnId: A.WORK_SCHEDULE,
      lines: lines([["Holiday plans for the pet", raw(QID.HOLIDAY_PLANS)]]),
    },
  };
}

export const ADOPTION_REFERENCES_FORM = {
  formId: ADOPTION_REFERENCES_FORM_ID,
  name: "Adoption Form and References",
  columns: ADOPTION_FORM_COLUMNS,
  columnIds: A,
  columnScript: "scripts/createAdoptionFormColumns.js",
  qid: { applicationId: QID.APPLICATION_ID, email: QID.EMAIL, fullName: QID.FULL_NAME },
  idUploadQids: [QID.ID_UPLOAD_1, QID.ID_UPLOAD_2],
  jotformColumns: { formId: A.JOTFORM_ADOPTION_FORM_FORM_ID, submissionId: A.JOTFORM_ADOPTION_FORM_SUBMISSION_ID },
  fillIfEmpty,
  sections,
};
