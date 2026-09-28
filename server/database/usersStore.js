import { USERS } from "../../src/constants/boards/users.js";
import { query, ident } from "./db.js";
import { boardFields, createItem, updateItem, fieldsFromMondayValues } from "./boardStore.js";

// The Users board in the database ("users" in DATABASE_BOARDS; database-
// first plan 4.8), for sign-in (auth.js), the live account state
// (accountState.js) and the Account and Users pages. Includes the password
// hash for sign-in checks: callers must never send a row to the browser
// as it is. Passwords and tokens also reach Monday at the nightly sync, as
// the user chose.

const TABLE = "users";
const U = USERS.COLUMNS;

const COLUMNS = {
  firstName: U.FIRST_NAME,
  lastName: U.LAST_NAME,
  email: U.EMAIL,
  passwordHash: U.PASSWORD_HASH,
  role: U.ROLE,
  accountStatus: U.ACCOUNT_STATUS,
  phone: U.PHONE,
  emailVerified: U.EMAIL_VERIFIED,
  lastLogin: U.LAST_LOGIN,
  preferences: U.PREFERENCES,
};

async function select(where = "", params = []) {
  const { field, extra, table } = await boardFields(TABLE);
  const picks = Object.entries(COLUMNS)
    .filter(([, columnId]) => columnId)
    .map(([key, columnId]) => `${ident(field(columnId))} as "${key}"`);

  picks.push(`${ident(extra(U.PHONE))} as "phoneCountry"`, `${ident(extra(U.LAST_LOGIN))} as "lastLoginTime"`);

  const { rows } = await query(`select monday_item_id, name, ${picks.join(", ")} from ${ident(table)} ${where} order by monday_item_id`, params);

  return rows.map((row) => ({
    id: String(row.monday_item_id),
    name: row.name ?? "",
    firstName: row.firstName ?? "",
    lastName: row.lastName ?? "",
    email: row.email ?? "",
    passwordHash: row.passwordHash ?? "",
    role: row.role ?? "",
    accountStatus: row.accountStatus ?? "",
    phone: { number: row.phone ?? "", country: row.phoneCountry ?? "" },
    emailVerified: row.emailVerified ?? "",
    // As Monday's raw value, which the Account page's code reads.
    lastLoginRaw: row.lastLogin ? JSON.stringify({ date: row.lastLogin, time: row.lastLoginTime ?? null }) : null,
    lastLoginIso: row.lastLogin ? `${row.lastLogin}T${row.lastLoginTime || "00:00:00"}Z` : null,
    preferencesText: row.preferences ?? "",
  }));
}

export function allUsers() {
  return select();
}

export async function userById(userId) {
  if (!/^\d+$/.test(String(userId))) return null;

  return (await select("where monday_item_id = $1", [Number(userId)]))[0] ?? null;
}

// columnValues in Monday's format (what auth.js / account.js build).
export async function setUserValues(userId, columnValues) {
  await updateItem(TABLE, userId, { fields: await fieldsFromMondayValues(TABLE, columnValues) });
}

// A new account: its Monday item is created at once (1 call), so the user
// has their lasting id. Returns the id.
export async function createUser(name, columnValues) {
  const record = await createItem(TABLE, { name, fields: await fieldsFromMondayValues(TABLE, columnValues) });

  return record.id;
}
