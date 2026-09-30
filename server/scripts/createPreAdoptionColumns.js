// One-off: adds the Active Applications columns for the in-app Pre-Adoption
// Form (one column per question; docs/add-application-form.md). Missing
// columns are created in ONE Monday request; status columns get the form's
// own options as labels. Prints the ids for
// src/constants/boards/activeApplications.js; then run
// `node scripts/databaseSchema.js --refresh`.
//
//   node scripts/createPreAdoptionColumns.js
//
// Safe to re-run: existing columns with these titles (and the same type)
// are reused.
import "dotenv/config";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { PRE_ADOPTION_QUESTIONS } from "../../src/constants/forms/preAdoptionForm.js";
import { mondayDirectRequest as monday } from "../mondayClient.js";

const optionsOf = (key) => PRE_ADOPTION_QUESTIONS.find((question) => question.key === key).options;

// type: Monday column type. labels: a status column's labels, in order.
const COLUMNS = [
  { key: "HOW_HEARD", title: "How Heard", type: "text" },
  { key: "CATS_INTERESTED_IN", title: "Cats Interested In", type: "long_text" },
  { key: "TIME_AT_ADDRESS", title: "Time At Address", type: "text" },
  { key: "HOME_TENURE", title: "Home Tenure", type: "status", labels: optionsOf("homeTenure") },
  { key: "ACCOMMODATION_TYPE", title: "Accommodation Type", type: "status", labels: optionsOf("accommodationType") },
  { key: "PRIVATE_GARDEN", title: "Private Garden", type: "status", labels: optionsOf("privateGarden") },
  { key: "HOUSEHOLD_ACTIVITY_LEVEL", title: "Household Activity Level", type: "text" },
  { key: "HOUSEHOLD_MEMBERS", title: "Household Members", type: "long_text" },
  { key: "FAMILY_IN_AGREEMENT", title: "Family In Agreement", type: "status", labels: optionsOf("familyInAgreement") },
  { key: "FAMILY_AGREEMENT_NOTES", title: "Family Agreement Notes", type: "long_text" },
  { key: "PET_OWNER_EXPERIENCE", title: "Pet Owner Experience", type: "text" },
  { key: "CURRENT_PETS", title: "Current Pets", type: "long_text" },
  { key: "CURRENT_PETS_STERILISED", title: "Current Pets Sterilised", type: "status", labels: optionsOf("currentPetsSterilised") },
  { key: "HOURS_ALONE", title: "Hours Alone", type: "numbers" },
  { key: "HOUSEHOLD_ALLERGIES", title: "Household Allergies", type: "status", labels: optionsOf("allergies") },
  { key: "ALLERGY_DETAILS", title: "Allergy Details", type: "long_text" },
  { key: "CHIEF_CARER", title: "Chief Carer", type: "text" },
  { key: "PET_LOST_BEFORE", title: "Pet Lost Before", type: "status", labels: optionsOf("petLostBefore") },
  { key: "AGE_PREFERENCE", title: "Age Preference", type: "text" },
  { key: "CAT_PREFERENCES", title: "Cat Preferences", type: "text" },
  { key: "LIFETIME_COMMITMENT", title: "Lifetime Commitment", type: "status", labels: optionsOf("lifetimeCommitment") },
  { key: "OUTDOOR_ACCESS", title: "Outdoor Access", type: "status", labels: optionsOf("outdoorAccess") },
  { key: "TYPICAL_DAY", title: "Typical Day", type: "long_text" },
  { key: "APPLICATION_PHOTOS", title: "Application Photos", type: "file" },
  { key: "CONTACT_CONSENT", title: "Contact Consent", type: "text" },
];
const DESCRIPTION = "Pre-Adoption Form answer (IBKT app).";

// Status label indexes: 5 is Monday's grey "no status", so it's skipped.
function statusDefaults(labels) {
  const indexes = [0, 1, 2, 3, 4, 6, 7, 8, 9, 10];

  return JSON.stringify({ labels: Object.fromEntries(labels.map((label, position) => [String(indexes[position]), label])) });
}

const { boards } = await monday(`query ($id: [ID!]) { boards(ids: $id) { columns { id title type } } }`, {
  id: [ACTIVE_APPLICATIONS.BOARD_ID],
});
const existing = boards[0].columns;
const ids = {};
const missing = [];

for (const column of COLUMNS) {
  const found = existing.find((candidate) => candidate.title === column.title);

  if (found && found.type !== column.type) {
    console.error(`"${column.title}" exists but is a ${found.type} column, not ${column.type}. Rename it on Monday first.`);
    process.exit(1);
  }

  if (found) {
    ids[column.key] = found.id;
    console.log(`Already exists: ${column.title} (${found.id})`);
  } else {
    missing.push(column);
  }
}

if (missing.length) {
  const fields = missing.map((column, index) => {
    const defaults = column.labels ? `, defaults: ${JSON.stringify(statusDefaults(column.labels))}` : "";

    return `c${index}: create_column(board_id: $boardId, title: ${JSON.stringify(column.title)}, column_type: ${column.type}, description: $description${defaults}) { id }`;
  });
  const created = await monday(`mutation ($boardId: ID!, $description: String) {\n    ${fields.join("\n    ")}\n  }`, {
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    description: DESCRIPTION,
  });

  missing.forEach((column, index) => {
    ids[column.key] = created[`c${index}`].id;
    console.log(`Created: ${column.title} (${ids[column.key]})`);
  });
}

const lines = COLUMNS.map(({ key, title, type }) => `    ${key}: "${ids[key]}", // ${title} | ${type}`);

console.log(`\nIn src/constants/boards/activeApplications.js:\n${lines.join("\n")}`);
