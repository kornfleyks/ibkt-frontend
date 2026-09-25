import { USERS } from "../src/constants/boards/users.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;

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
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: MONDAY_API_TOKEN,
      "Content-Type": "application/json",
    },
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
  };
}

const COLUMN_IDS = [USERS.COLUMNS.ROLE, USERS.COLUMNS.ACCOUNT_STATUS];

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
export async function initAccountState() {
  try {
    await loadAll();
    console.log(`Account state: loaded ${accounts.size} users.`);
  } catch (err) {
    console.error("Account state: initial load failed, retrying in 30s.", err.message);
    setTimeout(initAccountState, 30_000);
  }
}

// { role, accountStatus } or null if the user doesn't exist. Unknown ids
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

// Merge a known change (from this server's own write, a proxied mutation,
// or a webhook). Unknown users are ignored - they'll be read on first use.
export function applyAccountChange(userId, changes) {
  const key = String(userId);
  const current = accounts.get(key);

  if (current) {
    accounts.set(key, { ...current, ...changes });
  }
}

// Status/Role column id -> state field, for decoding writes and webhooks.
export const TRACKED_COLUMNS = {
  [USERS.COLUMNS.ROLE]: "role",
  [USERS.COLUMNS.ACCOUNT_STATUS]: "accountStatus",
};
