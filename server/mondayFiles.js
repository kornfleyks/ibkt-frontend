import { mondayHeaders } from "./mondayApiVersion.js";
import { mondayFetch } from "./mondayRateLimit.js";
import { mondayDirectRequest } from "./mondayClient.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;

// Files live on Monday (file columns). Uploads go through Monday's /file
// endpoint as multipart; there's no per-file delete, so removing a file
// re-sets the column to the files that remain (`files` fully replaces).

// `file`: a multer file ({ buffer, mimetype, originalname }). Answers the
// new asset's id. Throws on Monday errors (err.rateLimited on its limit,
// from mondayFetch).
export async function addFileToColumn(itemId, columnId, file) {
  const query = `
    mutation ($file: File!) {
      add_file_to_column (
        item_id: ${Number(itemId)},
        column_id: "${columnId}",
        file: $file
      ) {
        id
      }
    }
  `;

  const formData = new FormData();
  formData.append("query", query);
  formData.append("variables[file]", new Blob([file.buffer], { type: file.mimetype }), file.originalname);

  const response = await mondayFetch(`${MONDAY_API_URL}/file`, {
    method: "POST",
    headers: mondayHeaders({ json: false }),
    body: formData,
  });

  const result = await response.json();

  if (result.errors) {
    const err = new Error(result.errors[0].message);
    err.mondayErrors = result.errors;
    throw err;
  }

  return String(result.data.add_file_to_column.id);
}

// Leaves only `assetIds` in the column.
export async function setColumnFiles(boardId, itemId, columnId, assetIds) {
  await mondayDirectRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $files: [FileInput!]!) {
      update_assets_on_item(board_id: $boardId, item_id: $itemId, column_id: $columnId, files: $files) { id }
    }`,
    { boardId: String(boardId), itemId: String(itemId), columnId, files: assetIds.map((assetId) => ({ assetId: Number(assetId), fileType: "asset" })) },
  );
}

// A file column's { text, value } straight from Monday.
export async function readFileColumn(itemId, columnId) {
  const data = await mondayDirectRequest(
    `query ($ids: [ID!], $columnIds: [String!]) { items(ids: $ids) { column_values(ids: $columnIds) { text value } } }`,
    { ids: [String(itemId)], columnIds: [columnId] },
  );
  const column = data.items?.[0]?.column_values?.[0];

  if (!column) return null;

  let value = null;

  try {
    value = column.value ? JSON.parse(column.value) : null;
  } catch {
    value = null;
  }

  return { text: column.text ?? "", value };
}

// { text, value } of a file column -> [{ assetId, name, url }]. Monday lists
// every file's URL in `text` (comma-space separated, in `value.files`
// order) - there's no per-file URL elsewhere (same as CatMapper).
export function filesOf(column) {
  const files = column?.value?.files ?? [];
  const urls = (column?.text || "").split(", ");

  return files.map((file, index) => ({ assetId: String(file.assetId), name: file.name, url: urls[index] || null }));
}

// Monday's own record of some assets, for files uploaded outside the app:
// Map assetId -> { uploadedAt, uploaderName, sizeBytes, extension }.
export async function readAssets(assetIds) {
  if (!assetIds.length) return new Map();

  const data = await mondayDirectRequest(
    `query ($ids: [ID!]!) { assets(ids: $ids) { id created_at file_size file_extension uploaded_by { name } } }`,
    { ids: assetIds.map(String) },
  );

  return new Map(
    (data.assets ?? []).map((asset) => [
      String(asset.id),
      {
        uploadedAt: asset.created_at ?? null,
        uploaderName: asset.uploaded_by?.name ?? null,
        sizeBytes: asset.file_size ?? null,
        extension: asset.file_extension ?? null,
      },
    ]),
  );
}
