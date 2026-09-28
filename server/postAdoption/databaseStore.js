import { readRecord, readRecords, createRecord, changeRecord } from "../database/boardRecords.js";
import { boardFields } from "../database/boardStore.js";
import { ident } from "../database/db.js";
import { POST_ADOPTION_FIELDS, CREATE_ONLY_FIELDS, TABLE } from "./fields.js";

// Post-adoption records kept in the database ("post_adoption" in
// DATABASE_BOARDS). Same interface as mondayStore.js. Creating a record
// makes its Monday item at once (1 call); changes reach Monday at the
// nightly sync. The application's side of the Linked Adopter link is kept
// in step by the store (LINK_PAIRS in database/mondaySchema.js).

const ALL_FIELDS = { ...POST_ADOPTION_FIELDS, ...CREATE_ONLY_FIELDS };

export function getRecord(id) {
  return readRecord(TABLE, POST_ADOPTION_FIELDS, id);
}

// The record linked to an application (the newest, if several).
export async function findByApplication(applicationId) {
  const { field } = await boardFields(TABLE);
  const records = await readRecords(TABLE, POST_ADOPTION_FIELDS, {
    where: `$1::bigint = any(${ident(field(CREATE_ONLY_FIELDS.linkedApplicationIds.column))})`,
    params: [Number(applicationId)],
    order: "monday_item_id desc",
  });

  return records[0] ?? null;
}

export async function createPostAdoption({ name, values, applicationId, catId }) {
  const record = await createRecord(TABLE, ALL_FIELDS, {
    name,
    values: { ...values, linkedApplicationIds: [applicationId], linkedCatIds: catId ? [catId] : [] },
  });

  return getRecord(record.id);
}

// { before, after } or null when there's no such record.
export function updatePostAdoption(id, changes) {
  return changeRecord(TABLE, POST_ADOPTION_FIELDS, id, changes);
}
