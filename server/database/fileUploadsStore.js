import { query } from "./db.js";

// The file_uploads table (scripts/databaseSchema.js): what the app knows
// about a file it uploaded to Monday - the real uploader, when, and what
// it is. Keyed by the Monday asset id.

function toUpload(row) {
  return {
    assetId: String(row.asset_id),
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    mimeType: row.mime_type,
    documentType: row.document_type,
    note: row.note ?? "",
    uploadedBy: row.uploaded_by_name ? { id: row.uploaded_by_id, name: row.uploaded_by_name, role: row.uploaded_by_role ?? "" } : null,
    uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
  };
}

export async function recordUpload({ assetId, boardId, itemId, columnId, fileName, sizeBytes, mimeType, documentType, note, uploadedBy }) {
  const { rows } = await query(
    `insert into file_uploads (asset_id, board_id, monday_item_id, column_id, file_name, size_bytes, mime_type, document_type, note,
                               uploaded_by_id, uploaded_by_name, uploaded_by_role)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (asset_id) do nothing
     returning *`,
    [Number(assetId), String(boardId), Number(itemId), columnId, fileName, sizeBytes ?? null, mimeType ?? null, documentType ?? null, note || null,
      uploadedBy.id, uploadedBy.name, uploadedBy.role],
  );

  return rows[0] ? toUpload(rows[0]) : null;
}

// Map assetId -> upload details, for the given assets.
export async function uploadsOf(assetIds) {
  if (!assetIds.length) return new Map();

  const { rows } = await query("select * from file_uploads where asset_id = any($1::bigint[])", [assetIds.map(Number)]);

  return new Map(rows.map((row) => [String(row.asset_id), toUpload(row)]));
}

export async function deleteUpload(assetId) {
  await query("delete from file_uploads where asset_id = $1", [Number(assetId)]);
}
