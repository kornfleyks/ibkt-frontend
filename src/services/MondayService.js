import { readAuth, clearAuth, updateStoredRole } from './authStorage';

// All Monday requests go through our own server, which holds the API
// token. The browser never sees it (see /server/index.js).
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function getAuthToken() {
    return readAuth()?.token ?? null;
}

// requireAuth sends the account's live role on every response, so a role
// change made by an Admin reaches this browser on its next request.
function syncRoleFromResponse(response) {
    const role = response.headers.get('X-User-Role');

    if (role) {
        updateStoredRole(role);
    }
}

// This is a plain module, not a component, so it can't read AuthContext -
// on an expired/invalid session it just clears storage and hard-redirects,
// same end state a logout would produce.
function handleUnauthorized() {
    clearAuth();

    const loginUrl = `${import.meta.env.BASE_URL}login`.replace(/\/+/g, '/');

    if (!window.location.pathname.endsWith('/login')) {
        window.location.href = loginUrl;
    }
}

// For authenticated server endpoints that aren't the generic Monday
// proxy (e.g. admin-only account actions that must hash/verify server-side).
export async function serverPost(path, body) {
    const token = getAuthToken();

    const response = await fetch(`${SERVER_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });

    syncRoleFromResponse(response);

    if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Not authenticated.');
    }

    const result = await response.json();

    if (!response.ok || result.error) {
        console.error(result.error);
        throw new Error(result.error || 'Request failed.');
    }

    return result;
}

// GET counterpart of serverPost, for read-only server endpoints.
export async function serverGet(path) {
    const token = getAuthToken();

    const response = await fetch(`${SERVER_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    syncRoleFromResponse(response);

    if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Not authenticated.');
    }

    const result = await response.json();

    if (!response.ok || result.error) {
        console.error(result.error);
        throw new Error(result.error || 'Request failed.');
    }

    return result;
}

export async function mondayRequest(query, variables = {}, { cacheTtlMs } = {}) {
    const token = getAuthToken();

    const response = await fetch(`${SERVER_URL}/api/monday`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            query,
            variables,
            cacheTtlMs,
        }),
    });

    syncRoleFromResponse(response);

    if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Not authenticated.');
    }

    const result = await response.json();

    if (!response.ok || result.error) {
        console.error(result.error);
        throw new Error(result.error || 'Monday request failed.');
    }

    return result.data;
}

export async function changeMondayColumnValue(
  boardId,
  itemId,
  columnId,
  value,
  { createLabelsIfMissing = false } = {}
) {
  const query = `
    mutation (
      $boardId: ID!,
      $itemId: ID!,
      $columnId: String!,
      $value: JSON!,
      $createLabelsIfMissing: Boolean
    ) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value,
        create_labels_if_missing: $createLabelsIfMissing
      ) {
        id
      }
    }
  `;

  return mondayRequest(query, {
    boardId,
    itemId,
    columnId,
    value: JSON.stringify(value),
    createLabelsIfMissing,
  });
}

// The file column API has no per-file delete - the only way to remove one
// file is to re-set the whole column to the list of files that should
// remain (verified against the live API: `files` fully replaces, not merges).
export async function updateColumnAssets(boardId, itemId, columnId, files) {
  const query = `
    mutation (
      $boardId: ID!,
      $itemId: ID!,
      $columnId: String!,
      $files: [FileInput!]!
    ) {
      update_assets_on_item(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        files: $files
      ) {
        id
      }
    }
  `;

  return mondayRequest(query, { boardId, itemId, columnId, files });
}

export async function createMondayItem(
  boardId,
  itemName,
  columnValues = {},
  { createLabelsIfMissing = false } = {}
) {
  const query = `
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

  const data = await mondayRequest(query, {
    boardId,
    itemName,
    columnValues: JSON.stringify(columnValues),
    createLabelsIfMissing,
  });

  return data.create_item.id;
}

// Monday's file-upload endpoint doesn't send CORS headers on top of that
// (verified: identical request works from Node, fails from the browser with
// a CORS preflight error), so this always has to go through the server.
export async function uploadMondayFile(itemId, columnId, file) {
  const formData = new FormData();
  formData.append("itemId", itemId);
  formData.append("columnId", columnId);
  formData.append("file", file);

  const token = getAuthToken();

  const response = await fetch(`${SERVER_URL}/api/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  syncRoleFromResponse(response);

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Not authenticated.");
  }

  const result = await response.json();

  if (!response.ok || result.error) {
    console.error(result.error);
    throw new Error(result.error || "Upload failed.");
  }

  return result;
}

// Dropdown columns don't expose their configured options through
// column_values on items - the option list lives on the column definition
// itself (settings_str, a JSON string) and has to be fetched separately.
// Column definitions change rarely (only when someone edits board setup),
// so this is cached far longer than the default.
const COLUMN_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

export async function getColumnSettings(boardId, columnIds) {
  const query = `
    query ($boardId: ID!, $columnIds: [String!]) {
      boards(ids: [$boardId]) {
        columns(ids: $columnIds) {
          id
          settings_str
        }
      }
    }
  `;

  const data = await mondayRequest(
    query,
    { boardId, columnIds },
    { cacheTtlMs: COLUMN_SETTINGS_CACHE_TTL_MS },
  );

  return data.boards[0].columns;
}