import crypto from "node:crypto";
import { FOSTERS } from "../../src/constants/boards/fosters.js";
import { USERS } from "../../src/constants/boards/users.js";
import { ROLES } from "../../src/constants/roles.js";
import { FOSTERS_STATUS_OPTIONS } from "../../src/constants/statuses/fostersStatuses.js";
import { createItem, fieldsFromMondayValues } from "../database/boardStore.js";
import { createUserAccount, findUserByEmail, hashPassword, setUserColumns } from "../auth.js";
import { getAccountState } from "../accountState.js";
import { toPhoneValue } from "../phoneValue.js";
import { countryFromText } from "../rescuerOnboarding/countryFromText.js";

// What approving a foster does (docs/foster-onboarding.md), shared by "Approve"
// on an application and "Add Foster" on the Fosters page, as for rescuers:
//   1. a Fosters board record (Active, with the agreement the person gave)
//   2. a login on the Users board (Role Foster, Active) linked to it, with a
//      password nobody knows until the person sets their own
//   3. a set-password link, valid for a week (issueSetPasswordLink, the same
//      as for rescuers: rescuerOnboarding/approval.js)
// The caller sends the email. `resume` ({ fosterId, userId }) and `onProgress`
// let an application keep how far it got, so a failure half way is finished by
// approving again instead of making duplicates.

import { ApprovalError } from "../rescuerOnboarding/approval.js";

export { issueSetPasswordLink, ApprovalError } from "../rescuerOnboarding/approval.js";

const F = FOSTERS.COLUMNS;
const U = USERS.COLUMNS;
const OPTIONS = FOSTERS_STATUS_OPTIONS;

function fosterValues(person) {
  const values = {
    [F.FIRST_NAME]: person.firstName,
    [F.LAST_NAME]: person.lastName,
    [F.EMAIL]: { email: person.email, text: person.email },
    [F.STATUS]: { label: OPTIONS.STATUS.ACTIVE },
  };
  const notes = [person.notes];
  const phone = toPhoneValue(person.phone);

  if (phone.value?.phone) values[F.PHONE] = phone.value;
  if (person.city) values[F.CITY] = person.city;
  if (person.address) values[F.ADDRESS] = { text: person.address };
  if (person.emergencyContact) values[F.EMERGENCY_CONTACT] = { text: person.emergencyContact };
  if (person.references) values[F.REFERENCES] = { text: person.references };

  const country = countryFromText(person.country);

  if (country) {
    values[F.COUNTRY] = country;
  } else if (person.country) {
    notes.push(`Country given: ${person.country}`);
  }

  // The agreement only when the person gave it (an application). A foster an
  // Admin adds directly has answered none, so the columns stay empty.
  if (person.consents) {
    values[F.FOSTER_AGREEMENT_SIGNED] = { label: OPTIONS.FOSTER_AGREEMENT_SIGNED.SIGNED };
    values[F.AGREEMENT_DATE] = { date: new Date().toISOString().slice(0, 10) };
  }

  const noteText = notes.filter(Boolean).join("\n");

  if (noteText) values[F.NOTES] = { text: noteText };

  return values;
}

// person: { firstName, lastName, email, phone: { country, number }, country,
// city, address, emergencyContact, references, notes, consents: boolean }.
// Returns { fosterId, userId }.
export async function createFosterAccount(person, { resume = {}, onProgress = async () => {} } = {}) {
  let { fosterId, userId } = resume;

  if (!userId && (await findUserByEmail(person.email))) {
    throw new ApprovalError("An account with this email already exists.", 409);
  }

  if (!fosterId) {
    const name = `${person.firstName} ${person.lastName}`.trim();
    const record = await createItem("fosters", { name, fields: await fieldsFromMondayValues("fosters", fosterValues(person)) });

    fosterId = String(record.id);
    await onProgress({ fosterId });
  }

  if (!userId) {
    // Nobody knows this password (a random one, hashed): signing in works only
    // once the person sets their own through the link.
    const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));

    userId = String(
      await createUserAccount({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        passwordHash,
        role: ROLES.FOSTER,
        accountStatus: "Active",
      }),
    );

    const links = { [U.LINKED_FOSTER]: { item_ids: [Number(fosterId)] } };
    const phone = toPhoneValue(person.phone);

    if (phone.value?.phone) links[U.PHONE] = phone.value;

    await setUserColumns(userId, links);
    // So the account is known to the live account state straight away.
    await getAccountState(userId);
    await onProgress({ userId });
  }

  return { fosterId, userId };
}
