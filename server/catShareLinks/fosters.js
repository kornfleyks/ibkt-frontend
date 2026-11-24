import { FOSTERS } from "../../src/constants/boards/fosters.js";
import { FOSTERS_STATUS_OPTIONS } from "../../src/constants/statuses/fostersStatuses.js";
import { ident } from "../database/db.js";
import { createItem, boardFields, fieldsFromMondayValues } from "../database/boardStore.js";
import { readRecords, rememberLabel } from "../database/boardRecords.js";
import { toPhoneValue } from "../phoneValue.js";
import { countryFromText } from "../rescuerOnboarding/countryFromText.js";

// The foster side of a shareable Add Cat link made for a foster. The foster
// is found in the Fosters table by exact email (never by name, so a link
// does not reveal who our fosters are). Someone not found is added with the
// status "Not yet registered"; when they later apply to foster, approving
// the application reuses that record (fosterOnboarding/approval.js).

const F = FOSTERS.COLUMNS;
const STATUS = FOSTERS_STATUS_OPTIONS.STATUS;
const MAX_TEXT = 255;

// The Fosters record with this email, as { id, status }, or null. The
// comparison ignores case and surrounding spaces.
export async function findFosterByEmail(email) {
  const board = await boardFields("fosters");
  const column = ident(board.field(F.EMAIL));
  const found = await readRecords("fosters", { status: { column: F.STATUS } }, { where: `lower(trim(${column})) = $1`, params: [String(email).trim().toLowerCase()] });

  return found[0] ? { id: found[0].id, status: found[0].status } : null;
}

// Makes the "Not yet registered" Fosters record for a person who is not in
// our records. person: { firstName, lastName, email, phone: { country,
// number } }; the caller has checked them. Resolves to the new record's id.
export async function createUnregisteredFoster(person) {
  const values = {
    [F.FIRST_NAME]: person.firstName,
    [F.LAST_NAME]: person.lastName,
    [F.EMAIL]: { email: person.email, text: person.email },
    [F.STATUS]: { label: STATUS.NOT_YET_REGISTERED },
  };
  const phone = toPhoneValue(person.phone);

  if (phone.value?.phone) values[F.PHONE] = phone.value;

  const country = countryFromText(person.phone?.country);

  if (country) values[F.COUNTRY] = country;

  // The status label is new to the board: add it to the local list now (Monday
  // gets it when the record syncs).
  await rememberLabel("fosters", F.STATUS, STATUS.NOT_YET_REGISTERED);

  const record = await createItem("fosters", {
    name: `${person.firstName} ${person.lastName}`.trim().slice(0, MAX_TEXT),
    fields: await fieldsFromMondayValues("fosters", values),
  });

  return String(record.id);
}
