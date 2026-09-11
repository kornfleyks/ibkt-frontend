const API_URL = import.meta.env.VITE_MONDAY_API_URL;

const API_TOKEN = import.meta.env.VITE_MONDAY_API_TOKEN;

const UPLOAD_PROXY_URL = import.meta.env.VITE_UPLOAD_PROXY_URL;

export async function mondayRequest(query, variables = {}) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            Authorization: API_TOKEN,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
            variables,
        }),
    });

    const result = await response.json();

    if (result.errors) {
        console.error(result.errors);
        throw new Error(result.errors[0].message);
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

// Monday's file-upload endpoint doesn't send CORS headers, so a browser can
// never call it directly (verified: identical request works from Node,
// fails from the browser with a CORS preflight error). This goes through a
// small local proxy server (see /server) that holds the token and forwards
// the upload from a server context instead.
export async function uploadMondayFile(itemId, columnId, file) {
  const formData = new FormData();
  formData.append("itemId", itemId);
  formData.append("columnId", columnId);
  formData.append("file", file);

  const response = await fetch(`${UPLOAD_PROXY_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

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

  const data = await mondayRequest(query, { boardId, columnIds });

  return data.boards[0].columns;
}