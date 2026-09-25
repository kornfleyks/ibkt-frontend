import { USERS } from "../src/constants/boards/users.js";
import { mondayHeaders } from "./mondayApiVersion.js";
import { mondayFetch } from "./mondayRateLimit.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;

// In-memory view of every account's live Status and Role, so requireAuth
// can reject suspended accounts and use the current role on every request
// without asking Monday each time. Kept current by:
//   - one full read of the Users board at startup (initAccountState),
//   - this server's own writes / proxied Users-board mutations (applyAccountChange),
//   - Monday webhooks for edits made directly on the board (see webhooks.js).
// Resets on restart like mondayCache.js - the startup read rebuilds it.

const accounts = new Map();
let initialized = false;

async function mondayDirectRequest(query, variables = {}) {
  const response = await mondayFetch(MONDAY_API_URL, {
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

function toState(item) {
  const columns = Object.fromEntries(item.column_values.map((column) => [column.id, column]));

  return {
    role: columns[USERS.COLUMNS.ROLE]?.text ?? "",
    accountStatus: columns[USERS.COLUMNS.ACCOUNT_STATUS]?.text ?? "",
    firstName: columns[USERS.COLUMNS.FIRST_NAME]?.text ?? "",
    lastName: columns[USERS.COLUMNS.LAST_NAME]?.text ?? "",
  };
}

const COLUMN_IDS = [
  USERS.COLUMNS.ROLE,
  USERS.COLUMNS.ACCOUNT_STATUS,
  USERS.COLUMNS.FIRST_NAME,
  USERS.COLUMNS.LAST_NAME,
];

async function loadAll() {
  const data = await mondayDirectRequest(
    `query ($boardId: ID!, $columnIds: [String!]) {
      boards(ids: [$boardId]) {
        items_page(limit: 500) {
          items { id column_values(ids: $columnIds) { id text } }
        }
      }
    }`,
    { boardId: USERS.BOARD_ID, columnIds: COLUMN_IDS },
  );

  accounts.clear();

  for (const item of data.boards[0].items_page.items) {
    accounts.set(String(item.id), toState(item));
  }

  initialized = true;
}

async function loadOne(userId) {
  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) {
      items(ids: $ids) { id column_values(ids: $columnIds) { id text } }
    }`,
    { ids: [userId], columnIds: COLUMN_IDS },
  );

  const item = data.items?.[0];

  if (item) {
    accounts.set(String(item.id), toState(item));
  }

  return item ? accounts.get(String(item.id)) : null;
}

// Retries in the background on failure - until it succeeds, getAccountState
// falls back to per-user lookups, so auth keeps working.
const MIN_RETRY_MS = 30_000;
const MAX_RETRY_MS = 10 * 60_000;

let retryMs = MIN_RETRY_MS;

// Retries with backoff (30s, doubling to 10 min) - or, when Monday's rate
// limit is the reason, right after Monday says the limit lifts.
export async function initAccountState() {
  try {
    await loadAll();
    retryMs = MIN_RETRY_MS;
    console.log(`Account state: loaded ${accounts.size} users.`);
  } catch (err) {
    const waitMs = err.rateLimited ? err.retryAfterSeconds * 1000 + 5_000 : retryMs;

    console.error(`Account state: initial load failed, retrying in ${Math.round(waitMs / 1000)}s.`, err.message);
    setTimeout(initAccountState, waitMs).unref();

    if (!err.rateLimited) {
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    }
  }
}

// { role, accountStatus, firstName, lastName } or null if the user doesn't exist. Unknown ids
// (e.g. an account created after startup) cost one Monday read, once.
export async function getAccountState(userId) {
  const key = String(userId);

  if (accounts.has(key)) {
    return accounts.get(key);
  }

  return loadOne(key);
}

export function isAccountStateReady() {
  return initialized;
}

const changeListeners = new Set();

// listener(userId, nextState, previousState) - called only when a tracked
// field actually changed. Returns an unsubscribe function.
export function onAccountChange(listener) {
  changeListeners.add(listener);

  return () => changeListeners.delete(listener);
}

// Merge a known change (from this server's own write, a proxied mutation,
// or a webhook). Unknown users are ignored - they'll be read on first use.
export function applyAccountChange(userId, changes) {
  const key = String(userId);
  const current = accounts.get(key);

  if (!current) {
    return;
  }

  const next = { ...current, ...changes };
  accounts.set(key, next);

  if (next.role !== current.role || next.accountStatus !== current.accountStatus) {
    for (const listener of changeListeners) {
      try {
        listener(key, next, current);
      } catch (err) {
        console.error("Account state listener failed:", err);
      }
    }
  }
}

export function displayNameOf(state, userId) {
  return `${state?.firstName ?? ""} ${state?.lastName ?? ""}`.trim() || `User ${userId}`;
}

// [{ id, name, role }] for every Active account, from memory - no Monday
// read. Feeds the @mention picker and notification recipient checks.
export function listActiveAccounts() {
  return [...accounts.entries()]
    .filter(([, state]) => state.accountStatus === "Active")
    .map(([id, state]) => ({ id, name: displayNameOf(state, id), role: state.role }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// First/Last Name column id -> state field, so a rename made through the
// app keeps the in-memory name current (name edits made directly on
// Monday are picked up at the next restart).
export const NAME_COLUMNS = {
  [USERS.COLUMNS.FIRST_NAME]: "firstName",
  [USERS.COLUMNS.LAST_NAME]: "lastName",
};

// Status/Role column id -> state field, for decoding writes and webhooks.
export const TRACKED_COLUMNS = {
  [USERS.COLUMNS.ROLE]: "role",
  [USERS.COLUMNS.ACCOUNT_STATUS]: "accountStatus",
};
