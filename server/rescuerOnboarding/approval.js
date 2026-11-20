import crypto from "node:crypto";
import { RESCUERS } from "../../src/constants/boards/rescuers.js";
import { USERS } from "../../src/constants/boards/users.js";
import { RESCUERS_STATUS_OPTIONS } from "../../src/constants/statuses/rescuersStatuses.js";
import { createItem, fieldsFromMondayValues } from "../database/boardStore.js";
import { createUserAccount, findUserByEmail, hashPassword, setUserColumns } from "../auth.js";
import { getAccountState } from "../accountState.js";
import { createResetCode, expiryColumnValue } from "../passwordReset/tokens.js";
import { toPhoneValue } from "../phoneValue.js";
import { countryFromText } from "./countryFromText.js";

// What approving a rescuer does (docs/rescuer-onboarding.md), shared by
// "Approve" on an application and "Add Rescuer" on the Rescuers page:
//   1. a Rescuers board record (Active, with the consents the person gave)
//   2. a login on the Users board (Role Rescuer, Active) linked to it, with
//      a password nobody knows until the person sets their own
//   3. a set-password link, valid for a week (issueSetPasswordLink)
// The caller sends the email. `resume` ({ rescuerId, userId }) and
// `onProgress` let an application keep how far it got, so a failure half
// way is finished by approving again instead of making duplicates.

const R = RESCUERS.COLUMNS;
const U = USERS.COLUMNS;
const R_OPTIONS = RESCUERS_STATUS_OPTIONS;

export const SET_PASSWORD_TTL_MINUTES = 7 * 24 * 60;

export class ApprovalError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function rescuerValues(person) {
  const values = {
    [R.FIRST_NAME]: person.firstName,
    [R.LAST_NAME]: person.lastName,
    [R.EMAIL]: { email: person.email, text: person.email },
    [R.STATUS]: { label: R_OPTIONS.STATUS.ACTIVE },
  };
  const notes = [person.notes];
  const phone = toPhoneValue(person.phone);

  if (phone.value?.phone) values[R.PHONE] = phone.value;
  if (person.whatsapp) values[R.WHATSAPP_NUMBER] = person.whatsapp;
  if (person.city) values[R.CITY] = person.city;

  const country = countryFromText(person.country);

  if (country) {
    values[R.COUNTRY] = country;
  } else if (person.country) {
    notes.push(`Country given: ${person.country}`);
  }

  if (R_OPTIONS.PREFERRED_CONTACT_METHOD[String(person.contactMethod ?? "").toUpperCase()]) {
    values[R.PREFERRED_CONTACT_METHOD] = { label: person.contactMethod };
  }

  // Consents only when the person gave them (an application). A rescuer
  // an Admin adds directly has answered none, so the columns stay empty.
  if (person.consents) {
    values[R.RESCUER_AGREEMENT_SIGNED] = { label: R_OPTIONS.RESCUER_AGREEMENT_SIGNED.SIGNED };
    values[R.VET_PERMISSION_GRANTED] = { label: R_OPTIONS.VET_PERMISSION_GRANTED.YES };
    values[R.MEDIA_USAGE_PERMISSION] = { label: R_OPTIONS.MEDIA_USAGE_PERMISSION.YES };
    values[R.MEDICAL_DISCLOSURE_ACCEPTED] = { label: R_OPTIONS.MEDICAL_DISCLOSURE_ACCEPTED.YES };
    values[R.FINANCIAL_RESPONSIBILITY_ACCEPTED] = { label: R_OPTIONS.FINANCIAL_RESPONSIBILITY_ACCEPTED.YES };
  }

  const noteText = notes.filter(Boolean).join("\n");

  if (noteText) values[R.NOTES] = { text: noteText };

  return values;
}

// person: { firstName, lastName, email, phone: { country, number },
// whatsapp, country, city, contactMethod, notes, consents: boolean }.
// Returns { rescuerId, userId }.
export async function createRescuerAccount(person, { resume = {}, onProgress = async () => {} } = {}) {
  let { rescuerId, userId } = resume;

  if (!userId && (await findUserByEmail(person.email))) {
    throw new ApprovalError("An account with this email already exists.", 409);
  }

  if (!rescuerId) {
    const name = `${person.firstName} ${person.lastName}`.trim();
    const record = await createItem("rescuers", { name, fields: await fieldsFromMondayValues("rescuers", rescuerValues(person)) });

    rescuerId = String(record.id);
    await onProgress({ rescuerId });
  }

  if (!userId) {
    // Nobody knows this password (a random one, hashed): signing in works
    // only once the person sets their own through the link.
    const passwordHash = await hashPassword(crypto.randomBytes(32).toString("hex"));

    userId = String(
      await createUserAccount({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        passwordHash,
        role: "Rescuer",
        accountStatus: "Active",
      }),
    );

    const links = { [U.LINKED_RESCUER]: { item_ids: [Number(rescuerId)] } };
    const phone = toPhoneValue(person.phone);

    if (phone.value?.phone) links[U.PHONE] = phone.value;

    await setUserColumns(userId, links);
    // So the account is known to the live account state straight away.
    await getAccountState(userId);
    await onProgress({ userId });
  }

  return { rescuerId, userId };
}

// A fresh set-password link for the rescuer's login: stores the code's hash
// and expiry on the Users record (replacing any earlier link) and returns
// { code, expiresAt }; the code only ever travels in the email.
export async function issueSetPasswordLink(userId) {
  const { code, stored, expiresAt } = createResetCode(Date.now(), SET_PASSWORD_TTL_MINUTES);

  await setUserColumns(userId, {
    [U.PASSWORD_RESET_TOKEN]: stored,
    [U.PASSWORD_RESET_EXPIRY]: expiryColumnValue(expiresAt),
  });

  return { code, expiresAt };
}
