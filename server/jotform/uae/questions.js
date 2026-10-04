// The Jotform "UAE Adoption Form & Agreement" (202981102716450), question by
// question: which Active Applications column each answer goes to
// (docs/jotform-step3.md). Read from the live form on 2026-10-01. Questions
// it shares with the UK/US Adoption Form fill the same columns (an applicant
// fills one or the other); questions repeating the Pre-Adoption Form get
// their own "UAE Form ..." columns; the rest are UAE-only. Shared by
// scripts/createAdoptionFormColumns.js --form uae (creates the new columns)
// and form.js (fills them). Same column shape as
// adoptionReferences/questions.js.

import { ADOPTION_FORM_COLUMNS } from "../adoptionReferences/questions.js";

export const UAE_FORM_ID = "202981102716450";

export const QID = {
  FULL_NAME: "119",
  ADDRESS: "120",
  TIME_AT_ADDRESS: "25",
  HOME_PHONE: "121",
  CELL_PHONE: "122",
  EMPLOYER: "28",
  WORK_PHONE: "123",
  LATEST_CALL_TIME: "30",
  EMAIL: "124",
  ABOUT_YOURSELF: "169",
  EMIRATES_ID_FRONT: "166",
  EMIRATES_ID_BACK: "167",
  VET_FEE_AGREEMENT: "36",
  DWELLING_TYPE: "43",
  OWNS_HOME: "160",
  GARDEN_BALCONY: "161",
  OUTDOOR_PLANS: "162",
  MOVING_SOON: "38",
  MOVING_PLANS: "39",
  LEAVING_UAE_PLANS: "163",
  BIRTH_DATE: "125",
  HOUSEHOLD_MEMBERS: "49",
  CHILDREN_PLANS: "50",
  ADOPTION_REASONS: "152",
  ADOPTION_REASONS_OTHER: "153",
  HOURS_ALONE: "117",
  KITTEN_ALONE: "146",
  PLANS_TO_DECLAW: "147",
  CURRENT_CATS_DECLAWED: "148",
  ALLERGIES: "51",
  ALLERGY_DETAILS: "52",
  CHIEF_RESPONSIBILITY: "126",
  PETS_OWNED_5_YEARS: "54",
  PETS_LIST: "55",
  SPOUSE_CAT: "56",
  SPOUSE_CAT_WHEN: "115",
  PET_LOST_OR_GIVEN: "151",
  PETS_REACTION: "58",
  PETS_VACCINATED: "59",
  VACCINATION_NOTES: "60",
  PRESENT_PETS_NEUTERED: "61",
  PRESENT_PETS_NEUTERED_NOTES: "62",
  PREVIOUS_PETS_NEUTERED: "63",
  PREVIOUS_PETS_NEUTERED_NOTES: "64",
  MEDICAL_BUDGET: "127",
  HOLIDAY_PLANS: "66",
  CATS_INTERESTED_IN: "145",
  AGE_PREFERENCE: "69",
  CAT_PREFERENCES: "159",
  FLEA_PREVENTION: "75",
  RELOCATION_BUDGET: "164",
  VETERINARIAN: "128",
  BEHAVIOUR_PLAN: "149",
  BEHAVIOUR_PLAN_OTHER: "154",
  LITTER_PROBLEM_PLAN: "150",
  LITTER_PROBLEM_PLAN_OTHER: "155",
  CAT_FOOD: "129",
  FAMILY_IN_AGREEMENT: "91",
  FAMILY_AGREEMENT_NOTES: "131",
  LIFETIME_COMMITMENT: "93",
  HOME_VISITS_ALLOWED: "94",
  CRUELTY_CHARGE: "95",
  CRUELTY_DETAILS: "132",
  ADOPTED_BEFORE: "97",
  RESCUE_NAME: "133",
  RESCUE_PHONE: "134",
  WHY_ADOPT: "135",
  WHY_ADOPT_OTHER: "136",
  CAT_LIVING_AREA: "100",
  OUTDOOR_SUPERVISED: "156",
  WHERE_CAT_EATS: "138",
  WHERE_CAT_SLEEPS: "139",
  REFERENCE_1_NAME: "107",
  REFERENCE_1_PHONE: "140",
  REFERENCE_2_NAME: "108",
  REFERENCE_2_PHONE: "141",
  REFERENCE_3_NAME: "109",
  REFERENCE_3_PHONE: "142",
  ANYTHING_ELSE: "143",
  VET_COSTS_AED: "177",
  ADOPTER_SIGNATURE: "178",
  ADOPTER_SIGNED_NAME: "179",
  ADOPTER_SIGNED_DATE: "181",
  // Hidden on the form: filled by a volunteer later (an edit).
  RESCUER_SIGNATURE: "182",
  RESCUER_SIGNED_NAME: "183",
  RESCUER_SIGNED_DATE: "184",
  // Hidden: filled by the "Send Adoption Form" link.
  APPLICATION_ID: "188",
};

const YES_NO = ["Yes", "No"];

// The UK/US form's column with this key, filled from the UAE question(s).
function shared(key, qids, format) {
  const column = ADOPTION_FORM_COLUMNS.find((candidate) => candidate.key === key);

  if (!column) throw new Error(`No Adoption Form column ${key}.`);

  return { ...column, qids, ...(format ? { format } : {}), shared: true };
}

export const UAE_FORM_COLUMNS = [
  // Shared with the UK/US Adoption Form (existing columns).
  shared("AF_FULL_NAME", [QID.FULL_NAME]),
  shared("AF_EMAIL", [QID.EMAIL]),
  shared("AF_ADDRESS", [QID.ADDRESS]),
  shared("AF_TIME_AT_ADDRESS", [QID.TIME_AT_ADDRESS]),
  shared("AF_HOME_PHONE", [QID.HOME_PHONE]),
  shared("AF_MOBILE_PHONE", [QID.CELL_PHONE]),
  shared("AF_EMPLOYER", [QID.EMPLOYER]),
  shared("AF_WORK_PHONE", [QID.WORK_PHONE]),
  shared("AF_LATEST_CALL_TIME", [QID.LATEST_CALL_TIME]),
  shared("AF_ID_DOCUMENTS", [QID.EMIRATES_ID_FRONT, QID.EMIRATES_ID_BACK]),
  shared("AF_PLANS_TO_DECLAW", [QID.PLANS_TO_DECLAW]),
  shared("AF_CURRENT_CATS_DECLAWED", [QID.CURRENT_CATS_DECLAWED]),
  shared("AF_CHIEF_RESPONSIBILITY", [QID.CHIEF_RESPONSIBILITY]),
  shared("AF_PETS_VACCINATED", [QID.PETS_VACCINATED]),
  shared("AF_VACCINATION_NOTES", [QID.VACCINATION_NOTES]),
  shared("AF_MEDICAL_BUDGET", [QID.MEDICAL_BUDGET]),
  shared("AF_HOLIDAY_PLANS", [QID.HOLIDAY_PLANS]),
  shared("AF_FLEA_PREVENTION", [QID.FLEA_PREVENTION]),
  shared("AF_VETERINARIAN", [QID.VETERINARIAN]),
  shared("AF_BEHAVIOUR_PLAN", [QID.BEHAVIOUR_PLAN, QID.BEHAVIOUR_PLAN_OTHER]),
  shared("AF_LITTER_PROBLEM_PLAN", [QID.LITTER_PROBLEM_PLAN, QID.LITTER_PROBLEM_PLAN_OTHER]),
  shared("AF_CAT_FOOD", [QID.CAT_FOOD]),
  shared("AF_HOME_VISITS_ALLOWED", [QID.HOME_VISITS_ALLOWED]),
  shared("AF_CRUELTY_CHARGE", [QID.CRUELTY_CHARGE]),
  shared("AF_CRUELTY_DETAILS", [QID.CRUELTY_DETAILS]),
  shared("AF_ADOPTED_BEFORE", [QID.ADOPTED_BEFORE]),
  shared("AF_PREVIOUS_RESCUE", [QID.RESCUE_NAME, QID.RESCUE_PHONE]),
  shared("AF_CAT_LIVING_AREA", [QID.CAT_LIVING_AREA]),
  shared("AF_OUTDOOR_SUPERVISED", [QID.OUTDOOR_SUPERVISED]),
  shared("AF_WHERE_CAT_EATS", [QID.WHERE_CAT_EATS]),
  shared("AF_WHERE_CAT_SLEEPS", [QID.WHERE_CAT_SLEEPS]),
  shared("REFEREE_3", [QID.REFERENCE_3_NAME, QID.REFERENCE_3_PHONE]),
  shared("AF_ANYTHING_ELSE", [QID.ANYTHING_ELSE]),

  // Repeating the Pre-Adoption Form: this form's own version.
  { key: "UAE_CATS_INTERESTED_IN", title: "UAE Form Cats Interested In", type: "long_text", qids: [QID.CATS_INTERESTED_IN], format: "text" },
  { key: "UAE_AGE_PREFERENCE", title: "UAE Form Age Preference", type: "text", qids: [QID.AGE_PREFERENCE], format: "choices" },
  { key: "UAE_CAT_PREFERENCES", title: "UAE Form Cat Preferences", type: "text", qids: [QID.CAT_PREFERENCES], format: "choices" },
  { key: "UAE_LIFETIME_COMMITMENT", title: "UAE Form Lifetime Commitment", type: "status", qids: [QID.LIFETIME_COMMITMENT], format: "text", labels: YES_NO },
  { key: "UAE_HOUSEHOLD_ALLERGIES", title: "UAE Form Household Allergies", type: "status", qids: [QID.ALLERGIES], format: "text", labels: YES_NO },
  { key: "UAE_ALLERGY_DETAILS", title: "UAE Form Allergy Details", type: "long_text", qids: [QID.ALLERGY_DETAILS], format: "text" },
  { key: "UAE_FAMILY_IN_AGREEMENT", title: "UAE Form Family In Agreement", type: "status", qids: [QID.FAMILY_IN_AGREEMENT], format: "text", labels: YES_NO },
  { key: "UAE_FAMILY_AGREEMENT_NOTES", title: "UAE Form Family Agreement Notes", type: "long_text", qids: [QID.FAMILY_AGREEMENT_NOTES], format: "text" },
  { key: "UAE_HOUSEHOLD_MEMBERS", title: "UAE Form Household Members", type: "long_text", qids: [QID.HOUSEHOLD_MEMBERS], format: "text" },
  { key: "UAE_HOURS_ALONE", title: "UAE Form Hours Alone", type: "long_text", qids: [QID.HOURS_ALONE], format: "text" },
  { key: "UAE_WHY_ADOPT", title: "UAE Form Why Adopt", type: "long_text", qids: [QID.WHY_ADOPT, QID.WHY_ADOPT_OTHER], format: "withNote" },
  { key: "UAE_ADOPTION_MOTIVATION", title: "UAE Form Adoption Motivation", type: "text", qids: [QID.ADOPTION_REASONS, QID.ADOPTION_REASONS_OTHER], format: "choices" },

  // UAE-only.
  { key: "UAE_ABOUT_YOURSELF", title: "About Yourself", type: "long_text", qids: [QID.ABOUT_YOURSELF], format: "text" },
  { key: "UAE_VET_FEE_AGREEMENT", title: "Agrees To Vet Fee Reimbursement", type: "status", qids: [QID.VET_FEE_AGREEMENT], format: "text", labels: YES_NO },
  { key: "UAE_DWELLING_TYPE", title: "Dwelling Type", type: "status", qids: [QID.DWELLING_TYPE], format: "text", labels: ["House", "Apartment", "Condo", "Mobile Home"] },
  { key: "UAE_OWNS_HOME", title: "Owns Home", type: "status", qids: [QID.OWNS_HOME], format: "text", labels: YES_NO },
  { key: "UAE_GARDEN_BALCONY", title: "Garden Or Balcony", type: "status", qids: [QID.GARDEN_BALCONY], format: "text", labels: ["Garden", "Balcony", "Both"] },
  { key: "UAE_OUTDOOR_PLANS", title: "Balcony Or Outdoor Plans", type: "long_text", qids: [QID.OUTDOOR_PLANS], format: "text" },
  { key: "UAE_MOVING_SOON", title: "Moving In 12 Months", type: "status", qids: [QID.MOVING_SOON], format: "text", labels: YES_NO },
  { key: "UAE_MOVING_PLANS", title: "Moving Plans", type: "long_text", qids: [QID.MOVING_PLANS], format: "text" },
  { key: "UAE_LEAVING_UAE_PLANS", title: "Plans When Leaving The UAE", type: "long_text", qids: [QID.LEAVING_UAE_PLANS], format: "text" },
  { key: "UAE_BIRTH_DATE", title: "Birth Date", type: "text", qids: [QID.BIRTH_DATE], format: "date" },
  { key: "UAE_CHILDREN_PLANS", title: "Children Planned Or Visiting", type: "status", qids: [QID.CHILDREN_PLANS], format: "text", labels: YES_NO },
  { key: "UAE_KITTEN_ALONE", title: "Where A Kitten Stays Alone", type: "long_text", qids: [QID.KITTEN_ALONE], format: "text" },
  { key: "UAE_PETS_OWNED_5_YEARS", title: "Pets Owned (5 Years)", type: "status", qids: [QID.PETS_OWNED_5_YEARS], format: "text", labels: ["0", "1", "2", "3", "4", "5", "6+"] },
  { key: "UAE_PETS_LIST", title: "Pets Owned List", type: "long_text", qids: [QID.PETS_LIST], format: "text" },
  { key: "UAE_SPOUSE_CAT", title: "Owned A Cat With Spouse", type: "text", qids: [QID.SPOUSE_CAT, QID.SPOUSE_CAT_WHEN], format: "withNote" },
  { key: "UAE_PET_LOST_OR_GIVEN", title: "Lost Or Gave Away A Pet", type: "status", qids: [QID.PET_LOST_OR_GIVEN], format: "text", labels: YES_NO },
  { key: "UAE_PETS_REACTION", title: "Current Pets With New Cats", type: "long_text", qids: [QID.PETS_REACTION], format: "text" },
  { key: "UAE_PRESENT_PETS_NEUTERED", title: "Present Pets Neutered", type: "long_text", qids: [QID.PRESENT_PETS_NEUTERED, QID.PRESENT_PETS_NEUTERED_NOTES], format: "withNote" },
  { key: "UAE_PREVIOUS_PETS_NEUTERED", title: "Previous Pets Neutered", type: "long_text", qids: [QID.PREVIOUS_PETS_NEUTERED, QID.PREVIOUS_PETS_NEUTERED_NOTES], format: "withNote" },
  { key: "UAE_RELOCATION_BUDGET", title: "Relocation Budget", type: "text", qids: [QID.RELOCATION_BUDGET], format: "text" },
  { key: "UAE_VET_COSTS_AED", title: "Vet Costs (AED)", type: "text", qids: [QID.VET_COSTS_AED], format: "text" },
  { key: "UAE_ADOPTER_SIGNATURE", title: "Adopter Signature", type: "text", qids: [QID.ADOPTER_SIGNATURE], format: "text" },
  { key: "UAE_ADOPTER_SIGNED_NAME", title: "Adopter Signed Name", type: "text", qids: [QID.ADOPTER_SIGNED_NAME], format: "text" },
  { key: "UAE_ADOPTER_SIGNED_DATE", title: "Adopter Signed Date", type: "text", qids: [QID.ADOPTER_SIGNED_DATE], format: "date" },
  { key: "UAE_RESCUER_SIGNATURE", title: "Rescuer Signature", type: "text", qids: [QID.RESCUER_SIGNATURE], format: "text" },
  { key: "UAE_RESCUER_SIGNED_NAME", title: "Rescuer Signed Name", type: "text", qids: [QID.RESCUER_SIGNED_NAME], format: "text" },
  { key: "UAE_RESCUER_SIGNED_DATE", title: "Rescuer Signed Date", type: "text", qids: [QID.RESCUER_SIGNED_DATE], format: "date" },
];

// The columns this form adds to the board (the shared ones already exist).
export const UAE_NEW_COLUMNS = UAE_FORM_COLUMNS.filter((column) => !column.shared);

