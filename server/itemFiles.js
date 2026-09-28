import multer from "multer";
import { addFileToColumn, setColumnFiles, readFileColumn, filesOf, readAssets } from "./mondayFiles.js";
import { clearCache } from "./mondayCache.js";
import { isDatabaseEnabled, query, ident } from "./database/db.js";
import { isDatabaseBoard } from "./database/switches.js";
import { boardFields } from "./database/boardStore.js";
import { refreshFileCopy } from "./database/fileCopies.js";
import * as uploads from "./database/fileUploadsStore.js";
import { HttpError } from "./httpAnswer.js";

// Files in one item's file column, with who uploaded each and when. The
// files stay on Monday; the app's own record of each upload (real uploader,
// size, type, document type, note) is in file_uploads, since Monday only
// ever sees the service account. Used by the application's Contracts
// (contracts.js) and the post-adoption Photos / Videos (postAdoption/).
// Callers check access first. `column`: { table, boardId, columnId }.

export class FileNotFoundError extends HttpError {
  constructor(message) {
    super(404, message);
  }
}

// The column's { text, value }: the database copy when the board is kept
// there, else Monday.
async function columnValue({ table, columnId }, itemId) {
  if (isDatabaseBoard(table)) {
    const { field } = await boardFields(table);
    const { rows } = await query(`select ${ident(field(columnId))} as files from ${ident(table)} where monday_item_id = $1`, [Number(itemId)]);

    return rows[0]?.files ?? null;
  }

  return readFileColumn(itemId, columnId);
}

function extensionOf(name) {
  const match = /\.([^.]+)$/.exec(name ?? "");

  return match ? match[1].toLowerCase() : null;
}

// Newest first: [{ assetId, name, url, extension, sizeBytes, documentType,
// note, uploadedBy: { id, name, role } | null, uploadedAt }]. Files added on
// Monday directly have no upload record; Monday's own details fill in.
export async function listItemFiles(column, itemId) {
  const files = filesOf(await columnValue(column, itemId));
  const assetIds = files.map((file) => file.assetId);
  const recorded = isDatabaseEnabled() ? await uploads.uploadsOf(assetIds) : new Map();
  let fromMonday = new Map();

  try {
    fromMonday = await readAssets(assetIds.filter((assetId) => !recorded.has(assetId)));
  } catch (err) {
    console.error("Files: couldn't read file details from Monday.", err.message);
  }

  return files
    .map((file) => {
      const record = recorded.get(file.assetId);
      const monday = fromMonday.get(file.assetId);

      return {
        assetId: file.assetId,
        name: file.name,
        url: file.url,
        extension: extensionOf(file.name) ?? monday?.extension ?? null,
        sizeBytes: record?.sizeBytes ?? monday?.sizeBytes ?? null,
        documentType: record?.documentType ?? null,
        note: record?.note ?? "",
        uploadedBy: record?.uploadedBy ?? (monday?.uploaderName ? { id: null, name: monday.uploaderName, role: "Monday" } : null),
        uploadedAt: record?.uploadedAt ?? monday?.uploadedAt ?? null,
      };
    })
    .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
}

// `file`: multer's file. `uploader`: { id, name, role }. Answers the new
// file as listItemFiles lists it.
export async function uploadItemFile(column, itemId, { file, documentType = null, note = "", uploader }) {
  const assetId = await addFileToColumn(itemId, column.columnId, file);

  if (isDatabaseEnabled()) {
    try {
      await uploads.recordUpload({
        assetId,
        boardId: column.boardId,
        itemId,
        columnId: column.columnId,
        fileName: file.originalname,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        documentType,
        note,
        uploadedBy: uploader,
      });
    } catch (err) {
      // The file is on Monday already; it just shows without its details.
      console.error("Files: couldn't record the upload details.", err.message);
    }
  }

  clearCache([column.boardId]);
  await refreshFileCopy(itemId, column.columnId);

  const files = await listItemFiles(column, itemId);

  return files.find((entry) => entry.assetId === assetId) ?? { assetId, name: file.originalname };
}

// Removes one file (Monday keeps the others). Answers the removed file's
// { assetId, name }; FileNotFoundError when it isn't on the item.
export async function deleteItemFile(column, itemId, assetId) {
  const files = filesOf(await columnValue(column, itemId));
  const target = files.find((file) => file.assetId === String(assetId));

  if (!target) throw new FileNotFoundError("That file isn't on this record.");

  await setColumnFiles(
    column.boardId,
    itemId,
    column.columnId,
    files.filter((file) => file.assetId !== target.assetId).map((file) => file.assetId),
  );

  if (isDatabaseEnabled()) {
    await uploads.deleteUpload(target.assetId).catch((err) => console.error("Files: couldn't remove the upload details.", err.message));
  }

  clearCache([column.boardId]);
  await refreshFileCopy(itemId, column.columnId);

  return target;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// File names in UTF-8 (multer's default reads them as latin1).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES }, defParamCharset: "utf8" });

// Route middleware: one multipart `file` (20MB max) on req.file.
export function receiveFile(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Files can be at most 20MB." });
    if (err) return next(err);

    next();
  });
}
