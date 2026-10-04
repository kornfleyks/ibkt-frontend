// The Jotform "Adoption Form and References" (211304838746458), question by
// question: which Active Applications column each answer goes to
// (docs/jotform-adoption-form-import.md). Read from the live form on
// 2026-09-30. Shared by scripts/createAdoptionFormColumns.js (creates the
// columns) and form.js / secondStage (fill them). When the client edits
// the form on Jotform, update this to match.
//
// A column: { key, title, type, qids, format, labels? }
//   key     its name in src/constants/boards/activeApplications.js
//   type    Monday column type (status columns get `labels`, in order)
//   qids    the question(s) it's made from
//   format  how the answer(s) become text: "text", "fullName", "address",
//           "phone", "choices" (ticked options + "other" text), "files",
//           "nameAndPhone", "reference" (name, phone, email)

export const ADOPTION_REFERENCES_FORM_ID = "211304838746458";

export const QID = {
  WHICH_CAT: "166",
  FULL_NAME: "119",
  ADDRESS: "120",
  TIME_AT_ADDRESS: "25",
  HOME_PHONE: "121",
  MOBILE_PHONE: "122",
  EMPLOYER: "28",
  WORK_PHONE: "123",
  LATEST_CALL_TIME: "30",
  EMAIL: "124",
  ID_UPLOAD_1: "169",
  ID_UPLOAD_2: "170",
  NEAREST_AIRPORTS: "158",
  CAN_AFFORD_FEE: "36",
  PLANS_TO_DECLAW: "147",
  CURRENT_CATS_DECLAWED: "148",
  CHIEF_RESPONSIBILITY: "126",
  PETS_VACCINATED: "59",
  VACCINATION_NOTES: "60",
  MEDICAL_BUDGET: "127",
  HOLIDAY_PLANS: "66",
  FLEA_PREVENTION: "75",
  VETERINARIAN: "128",
  BEHAVIOUR_PLAN: "149",
  BEHAVIOUR_PLAN_OTHER: "154",
  LITTER_PROBLEM_PLAN: "150",
  LITTER_PROBLEM_PLAN_OTHER: "155",
  CAT_FOOD: "129",
  HOME_VISITS_ALLOWED: "94",
  CRUELTY_CHARGE: "95",
  CRUELTY_DETAILS: "132",
  ADOPTED_BEFORE: "97",
  RESCUE_NAME: "133",
  RESCUE_PHONE: "134",
  CAT_LIVING_AREA: "100",
  OUTDOOR_SUPERVISED: "156",
  WHERE_CAT_EATS: "138",
  WHERE_CAT_SLEEPS: "139",
  REFERENCE_1_NAME: "107",
  REFERENCE_1_PHONE: "140",
  REFERENCE_1_EMAIL: "171",
  REFERENCE_2_NAME: "108",
  REFERENCE_2_PHONE: "141",
  REFERENCE_2_EMAIL: "172",
  REFERENCE_3_NAME: "109",
  REFERENCE_3_PHONE: "142",
  REFERENCE_3_EMAIL: "173",
  ANYTHING_ELSE: "143",
  // Hidden: filled by the "Send Adoption Form" link.
  APPLICATION_ID: "174",
};

const YES_NO = ["Yes", "No"];
const YES_NO_NA = ["Yes", "No", "N/A"];

// One column per answer. The first four repeat Pre-Adoption questions and
// keep this form's version next to the application's own.
export const ADOPTION_FORM_COLUMNS = [
  { key: "AF_FULL_NAME", title: "Adoption Form Name", type: "text", qids: [QID.FULL_NAME], format: "fullName" },
  { key: "AF_EMAIL", title: "Adoption Form Email", type: "text", qids: [QID.EMAIL], format: "text" },
  { key: "AF_ADDRESS", title: "Adoption Form Address", type: "long_text", qids: [QID.ADDRESS], format: "address" },
  { key: "AF_TIME_AT_ADDRESS", title: "Adoption Form Time At Address", type: "text", qids: [QID.TIME_AT_ADDRESS], format: "text" },
  { key: "AF_CAT_APPLYING_FOR", title: "Cat Applying For", type: "text", qids: [QID.WHICH_CAT], format: "text" },
  { key: "AF_HOME_PHONE", title: "Home Phone", type: "text", qids: [QID.HOME_PHONE], format: "phone" },
  { key: "AF_MOBILE_PHONE", title: "Mobile Phone", type: "text", qids: [QID.MOBILE_PHONE], format: "phone" },
  { key: "AF_EMPLOYER", title: "Employer", type: "long_text", qids: [QID.EMPLOYER], format: "text" },
  { key: "AF_WORK_PHONE", title: "Work Phone", type: "text", qids: [QID.WORK_PHONE], format: "phone" },
  { key: "AF_LATEST_CALL_TIME", title: "Latest Call Time", type: "text", qids: [QID.LATEST_CALL_TIME], format: "text" },
  { key: "AF_ID_DOCUMENTS", title: "ID Documents", type: "file", qids: [QID.ID_UPLOAD_1, QID.ID_UPLOAD_2], format: "files" },
  { key: "AF_NEAREST_AIRPORTS", title: "Nearest Airports", type: "text", qids: [QID.NEAREST_AIRPORTS], format: "choices" },
  { key: "AF_CAN_AFFORD_FEE", title: "Can Afford Fee", type: "status", qids: [QID.CAN_AFFORD_FEE], format: "text", labels: YES_NO },
  { key: "AF_PLANS_TO_DECLAW", title: "Plans To Declaw", type: "status", qids: [QID.PLANS_TO_DECLAW], format: "text", labels: ["Yes", "No", "Maybe"] },
  { key: "AF_CURRENT_CATS_DECLAWED", title: "Current Cats Declawed", type: "status", qids: [QID.CURRENT_CATS_DECLAWED], format: "text", labels: YES_NO_NA },
  { key: "AF_CHIEF_RESPONSIBILITY", title: "Chief Responsibility", type: "long_text", qids: [QID.CHIEF_RESPONSIBILITY], format: "text" },
  { key: "AF_PETS_VACCINATED", title: "Pets Vaccinated", type: "status", qids: [QID.PETS_VACCINATED], format: "text", labels: YES_NO_NA },
  { key: "AF_VACCINATION_NOTES", title: "Vaccination Notes", type: "long_text", qids: [QID.VACCINATION_NOTES], format: "text" },
  { key: "AF_MEDICAL_BUDGET", title: "Medical Budget", type: "long_text", qids: [QID.MEDICAL_BUDGET], format: "text" },
  { key: "AF_HOLIDAY_PLANS", title: "Holiday Plans", type: "long_text", qids: [QID.HOLIDAY_PLANS], format: "text" },
  { key: "AF_FLEA_PREVENTION", title: "Flea Prevention", type: "status", qids: [QID.FLEA_PREVENTION], format: "text", labels: YES_NO },
  { key: "AF_VETERINARIAN", title: "Veterinarian", type: "long_text", qids: [QID.VETERINARIAN], format: "text" },
  { key: "AF_BEHAVIOUR_PLAN", title: "Behaviour Plan", type: "long_text", qids: [QID.BEHAVIOUR_PLAN, QID.BEHAVIOUR_PLAN_OTHER], format: "choices" },
  { key: "AF_LITTER_PROBLEM_PLAN", title: "Litter Problem Plan", type: "long_text", qids: [QID.LITTER_PROBLEM_PLAN, QID.LITTER_PROBLEM_PLAN_OTHER], format: "choices" },
  { key: "AF_CAT_FOOD", title: "Cat Food", type: "long_text", qids: [QID.CAT_FOOD], format: "text" },
  { key: "AF_HOME_VISITS_ALLOWED", title: "Home Visits Allowed", type: "status", qids: [QID.HOME_VISITS_ALLOWED], format: "text", labels: YES_NO },
  { key: "AF_CRUELTY_CHARGE", title: "Cruelty Charge", type: "status", qids: [QID.CRUELTY_CHARGE], format: "text", labels: YES_NO },
  { key: "AF_CRUELTY_DETAILS", title: "Cruelty Details", type: "long_text", qids: [QID.CRUELTY_DETAILS], format: "text" },
  { key: "AF_ADOPTED_BEFORE", title: "Adopted Before", type: "status", qids: [QID.ADOPTED_BEFORE], format: "text", labels: YES_NO },
  { key: "AF_PREVIOUS_RESCUE", title: "Previous Rescue", type: "text", qids: [QID.RESCUE_NAME, QID.RESCUE_PHONE], format: "nameAndPhone" },
  {
    key: "AF_CAT_LIVING_AREA",
    title: "Cat Living Area",
    type: "status",
    qids: [QID.CAT_LIVING_AREA],
    format: "text",
    labels: ["Indoors Only", "Outdoors Only", "Indoors and Outdoors", "Barn Cat", "Basement/Garage", "Confined"],
  },
  { key: "AF_OUTDOOR_SUPERVISED", title: "Outdoor Supervised", type: "status", qids: [QID.OUTDOOR_SUPERVISED], format: "text", labels: YES_NO },
  { key: "AF_WHERE_CAT_EATS", title: "Where Cat Eats", type: "long_text", qids: [QID.WHERE_CAT_EATS], format: "text" },
  { key: "AF_WHERE_CAT_SLEEPS", title: "Where Cat Sleeps", type: "long_text", qids: [QID.WHERE_CAT_SLEEPS], format: "text" },
  {
    key: "REFEREE_3",
    title: "Referee 3",
    type: "text",
    qids: [QID.REFERENCE_3_NAME, QID.REFERENCE_3_PHONE, QID.REFERENCE_3_EMAIL],
    format: "reference",
  },
  { key: "AF_ANYTHING_ELSE", title: "Anything Else", type: "long_text", qids: [QID.ANYTHING_ELSE], format: "text" },
];
