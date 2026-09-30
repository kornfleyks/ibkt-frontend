import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getSessionExpiryHours } from "./appSettings.js";
import { getAccountState, applyAccountChange } from "./accountState.js";
import { passwordStampOf } from "./passwordStamp.js";
import { endPasswordChangedSessions } from "./sessionEvents.js";
import { USERS } from "../src/constants/boards/users.js";
import { mondayHeaders } from "./mondayApiVersion.js";
import { mondayFetch as rateLimitedFetch } from "./mondayRateLimit.js";
import { parsePreferences } from "../src/constants/preferences.js";
import { isDatabaseBoard } from "./database/switches.js";
import * as usersStore from "./database/usersStore.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in server/.env (see server/.env.example).");
}

// Shared with the frontend so a column recreated on Monday only needs its
// id updated in one place.
export const USERS_BOARD_ID = USERS.BOARD_ID;

const USERS_COLUMNS = USERS.COLUMNS;

// This module talks to Monday directly with the server's own API token,
// deliberately bypassing the generic /api/monday proxy - auth has to work
// before a session token exists to authenticate that proxy call with.
// With "users" in DATABASE_BOARDS it reads and writes the database instead
// (database/usersStore.js); the nightly sync copies changes to Monday.
function inDatabase() {
  return isDatabaseBoard("users");
}

// A usersStore row -> the same shape as mapUserItem.
function fromStore(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    accountStatus: user.accountStatus,
    preferences: parsePreferences(user.preferencesText),
    passwordResetToken: user.passwordResetToken,
  };
}
async function mondayFetch(query, variables = {}) {
  const response = await rateLimitedFetch(MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

function mapUserItem(item) {
  const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));

  return {
    id: item.id,
    firstName: columns[USERS_COLUMNS.FIRST_NAME]?.text ?? "",
    lastName: columns[USERS_COLUMNS.LAST_NAME]?.text ?? "",
    email: columns[USERS_COLUMNS.EMAIL]?.text ?? "",
    passwordHash: columns[USERS_COLUMNS.PASSWORD_HASH]?.text ?? "",
    role: columns[USERS_COLUMNS.ROLE]?.text ?? "",
    accountStatus: columns[USERS_COLUMNS.ACCOUNT_STATUS]?.text ?? "",
    preferences: parsePreferences(columns[USERS_COLUMNS.PREFERENCES]?.text),
    passwordResetToken: columns[USERS_COLUMNS.PASSWORD_RESET_TOKEN]?.text ?? "",
  };
}

// The Users board is small enough that fetching everything and filtering
// in memory (same approach the rest of this app already uses for
// per-entity lookups) is simpler and more robust than relying on Monday's
// column-type-specific filter operators for an exact email match.
async function getAllAuthUsers() {
  if (inDatabase()) {
    return (await usersStore.allUsers()).map(fromStore);
  }

  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) {
          items {
            id
            column_values {
              id
              text
            }
          }
        }
      }
    }
  `;

  const data = await mondayFetch(query, { boardId: USERS_BOARD_ID });

  return data.boards[0].items_page.items.map(mapUserItem);
}

// Safe-to-share view of every user (no email, hash or tokens) - for
// features that pick or resolve users, e.g. Case Owner assignment.
export async function getUserDirectory() {
  const users = await getAllAuthUsers();

  return users.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim() || `User ${user.id}`,
    role: user.role,
    accountStatus: user.accountStatus,
  }));
}

export async function findUserByEmail(email) {
  const users = await getAllAuthUsers();
  const normalized = email.trim().toLowerCase();

  return users.find((user) => user.email.trim().toLowerCase() === normalized) ?? null;
}

// The user whose stored Password Reset Token `matches` accepts
// (passwordReset/tokens.js) - the reset link carries only the code.
export async function findUserByResetToken(matches) {
  const users = await getAllAuthUsers();

  return users.find((user) => user.passwordResetToken && matches(user.passwordResetToken)) ?? null;
}

export async function setUserPasswordHash(userId, passwordHash) {
  if (inDatabase()) {
    return usersStore.setUserValues(userId, { [USERS_COLUMNS.PASSWORD_HASH]: passwordHash });
  }

  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) {
        id
      }
    }
  `;

  return mondayFetch(mutation, {
    boardId: USERS_BOARD_ID,
    itemId: userId,
    columnId: USERS_COLUMNS.PASSWORD_HASH,
    value: JSON.stringify(passwordHash),
  });
}

// Call after every password write (reset link, own change, Admin): every
// session made with the old password is refused from its next request, and
// open tabs are told at once. `exceptSignedInAt` (a session's iat) keeps
// the session that made the change signed in - it needs a new token from
// signToken with the new hash.
export function recordPasswordChange(userId, passwordHash, { exceptSignedInAt } = {}) {
  applyAccountChange(userId, { passwordStamp: passwordStampOf(passwordHash) });
  endPasswordChangedSessions(userId, { exceptSignedInAt });
}

// Last Login is a date column with time; written in UTC like the Activity
// Log's Timestamp, so the app can show it correctly in any timezone.
export async function setUserLastLogin(userId) {
  const now = new Date().toISOString();

  if (inDatabase()) {
    return usersStore.setUserValues(userId, { [USERS_COLUMNS.LAST_LOGIN]: { date: now.slice(0, 10), time: now.slice(11, 19) } });
  }

  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }
  `;

  return mondayFetch(mutation, {
    boardId: USERS_BOARD_ID,
    itemId: userId,
    columnId: USERS_COLUMNS.LAST_LOGIN,
    value: JSON.stringify({ date: now.slice(0, 10), time: now.slice(11, 19) }),
  });
}

function parseJson(rawValue) {
  try {
    return JSON.parse(rawValue || "null");
  } catch {
    return null;
  }
}

// One account's own row, for the Account page (GET /api/account and the
// self-service updates). Includes the password hash for current-password
// checks - never send the result to the browser as-is.
export async function getAccountRow(userId) {
  if (inDatabase()) {
    const user = await usersStore.userById(userId);

    return user
      ? { ...fromStore(user), phone: user.phone, emailVerified: user.emailVerified, lastLoginRaw: user.lastLoginRaw }
      : null;
  }

  const query = `
    query ($ids: [ID!]) {
      items(ids: $ids) {
        id
        column_values {
          id
          text
          value
        }
      }
    }
  `;

  const data = await mondayFetch(query, { ids: [userId] });
  const item = data.items?.[0];

  if (!item) {
    return null;
  }

  const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));
  const phone = parseJson(columns[USERS_COLUMNS.PHONE]?.value);

  return {
    ...mapUserItem(item),
    phone: {
      number: phone?.phone ?? columns[USERS_COLUMNS.PHONE]?.text ?? "",
      country: phone?.countryShortName ?? "",
    },
    emailVerified: columns[USERS_COLUMNS.EMAIL_VERIFIED]?.text ?? "",
    lastLoginRaw: columns[USERS_COLUMNS.LAST_LOGIN]?.value ?? null,
  };
}

// columnValues: { [columnId]: value } in Monday's column-value format.
export async function setUserColumns(userId, columnValues) {
  if (inDatabase()) {
    return usersStore.setUserValues(userId, columnValues);
  }

  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) { id }
    }
  `;

  return mondayFetch(mutation, {
    boardId: USERS_BOARD_ID,
    itemId: userId,
    columnValues: JSON.stringify(columnValues),
  });
}

export async function createPendingUser({ firstName, lastName, email, passwordHash }) {
  const columnValues = {
    [USERS_COLUMNS.FIRST_NAME]: firstName,
    [USERS_COLUMNS.LAST_NAME]: lastName,
    [USERS_COLUMNS.EMAIL]: { email, text: email },
    [USERS_COLUMNS.PASSWORD_HASH]: passwordHash,
    [USERS_COLUMNS.ROLE]: { label: "Adopter" },
    [USERS_COLUMNS.ACCOUNT_STATUS]: { label: "Pending" },
  };

  if (inDatabase()) {
    return usersStore.createUser(`${firstName} ${lastName}`, columnValues);
  }

  const mutation = `
    mutation (
      $boardId: ID!,
      $itemName: String!,
      $columnValues: JSON,
      $createLabelsIfMissing: Boolean
    ) {
      create_item(
        board_id: $boardId,
        item_name: $itemName,
        column_values: $columnValues,
        create_labels_if_missing: $createLabelsIfMissing
      ) {
        id
      }
    }
  `;

  const data = await mondayFetch(mutation, {
    boardId: USERS_BOARD_ID,
    itemName: `${firstName} ${lastName}`,
    columnValues: JSON.stringify(columnValues),
    createLabelsIfMissing: true,
  });

  return data.create_item.id;
}

export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// `session` (a verified token's own { iat, exp }, seconds since epoch)
// re-issues a token for the same session, e.g. after a name/email change,
// without extending it: editing a profile must not keep a session alive
// forever. Keeping iat means "signed in at" stays the real sign-in time.
// `pwd` is the password stamp (passwordStamp.js): from `user.passwordHash`
// when given (sign-in, own password change), else kept from `session`.
export async function signToken(user, { session } = {}) {
  const claims = {
    sub: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    pwd: user.passwordHash ? passwordStampOf(user.passwordHash) : session?.pwd,
  };

  if (session?.exp) {
    return jwt.sign({ ...claims, iat: session.iat, exp: session.exp }, JWT_SECRET);
  }

  const sessionExpiryHours = await getSessionExpiryHours();

  return jwt.sign(claims, JWT_SECRET, { expiresIn: `${sessionExpiryHours}h` });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  let payload;

  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  // The token only proves who this is; whether the account is still Active
  // and what role it has now come from the live account state (updated in
  // memory, not read from Monday per request - see accountState.js). So a
  // suspension or role change applies on the very next request.
  getAccountState(payload.sub)
    .then((state) => {
      if (!state) {
        return res.status(401).json({ error: "This account no longer exists.", code: "ACCOUNT_INACTIVE" });
      }

      if (state.accountStatus !== "Active") {
        return res.status(401).json({ error: "This account is not active.", code: "ACCOUNT_INACTIVE" });
      }

      // Made with a password that has since changed. Tokens from before
      // stamps existed carry no `pwd` and stay valid until they expire.
      if (payload.pwd && state.passwordStamp && payload.pwd !== state.passwordStamp) {
        return res.status(401).json({ error: "Your password was changed. Sign in again.", code: "PASSWORD_CHANGED" });
      }

      req.user = { ...payload, role: state.role };
      // Lets the frontend pick up a role change without a new login.
      res.set("X-User-Role", state.role);
      next();
    })
    .catch((err) => {
      // Monday unreachable and the user not yet in memory: fall back to the
      // token's own claims rather than locking everyone out.
      console.error("requireAuth: account state lookup failed, using token claims.", err.message);
      req.user = payload;
      next();
    });
}

// Must run after requireAuth, which populates req.user.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  next();
}
