import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { CONTRACT_DOCUMENT_TYPES, CONTRACT_NOTE_MAX_LENGTH } from "../src/constants/contractDocumentTypes.js";
import { requireApplicationAccess } from "./applicationAccess.js";
import { listItemFiles, uploadItemFile, deleteItemFile, receiveFile } from "./itemFiles.js";
import { answer } from "./httpAnswer.js";
import { changeApplication } from "./applications.js";
import { logActivity, getItemSnapshot, getItemName } from "./activityLog.js";
import { mondayDirectRequest } from "./mondayClient.js";
import { clearCache } from "./mondayCache.js";
import { isDatabaseBoard } from "./database/switches.js";
import { actorOf, InputError } from "./database/boardRecords.js";

// An application's contract files (the Contracts tab). The files, with who
// uploaded each one and when, come from itemFiles.js; this adds the
// document type and note, and the contract statuses. Only Admins and the
// application's Case Owner may list, upload or delete. /api/upload and
// /api/monday refuse this column, so these rules can't be skipped.
//
//   GET    /api/applications/:id/contracts            the files, newest first
//   POST   /api/applications/:id/contracts            multipart: file, documentType, note?
//   DELETE /api/applications/:id/contracts/:assetId
//
// Uploading a Draft / Final / Signed file sets that contract status to
// "Yes" (logged like any change); deleting one leaves the status as is.

const BOARD_ID = ACTIVE_APPLICATIONS.BOARD_ID;
const TABLE = "applications";
const BOARD_NAME = "Active Applications";
const YES = "Yes";

export const CONTRACT_FILE_COLUMN_ID = ACTIVE_APPLICATIONS.COLUMNS.CONTRACT_FILE;

const CONTRACT_COLUMN = { table: TABLE, boardId: BOARD_ID, columnId: CONTRACT_FILE_COLUMN_ID };

// Sets one contract status to "Yes" unless it already is. Answers
// { [statusField]: "Yes" } when it changed, else {}.
async function markStatus(actor, applicationId, documentType) {
  const { statusField, statusColumn, statusLabel } = documentType;

  if (!statusField) return {};

  const before = await getItemSnapshot(applicationId, statusColumn, BOARD_ID);

  if (before?.columnText === YES) return {};

  // Saved (and logged) like any application change; the nightly sync sends it.
  if (isDatabaseBoard(TABLE)) {
    await changeApplication(actor, applicationId, { [statusField]: YES });
    return { [statusField]: YES };
  }

  await mondayDirectRequest(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }`,
    { boardId: BOARD_ID, itemId: String(applicationId), columnId: statusColumn, value: YES },
  );
  clearCache([BOARD_ID]);

  const itemName = before?.itemName || `item ${applicationId}`;
  const oldValue = before?.columnText || "(empty)";

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: BOARD_ID,
    boardName: BOARD_NAME,
    itemId: applicationId,
    itemName,
    actionType: "Updated",
    description: `${actor.name} changed ${statusLabel} from "${oldValue}" to "${YES}" on ${itemName}`,
    fieldChanged: statusLabel,
    oldValue,
    newValue: YES,
    raw: { applicationId, [statusField]: YES },
  });

  return { [statusField]: YES };
}

async function logFileActivity(actor, applicationId, description, raw) {
  const itemName = (await getItemName(applicationId)) || `item ${applicationId}`;

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: BOARD_ID,
    boardName: BOARD_NAME,
    itemId: applicationId,
    itemName,
    actionType: "Updated",
    description: `${description} on ${itemName}`,
    fieldChanged: "Contract File",
    raw,
  });
}

async function uploadContract(req) {
  const applicationId = req.params.id;
  const file = req.file;
  const documentTypeKey = req.body?.documentType;
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
  const documentType = Object.hasOwn(CONTRACT_DOCUMENT_TYPES, documentTypeKey ?? "") ? CONTRACT_DOCUMENT_TYPES[documentTypeKey] : null;

  if (!file) throw new InputError("A file is required.");
  if (!documentType) throw new InputError("Pick a document type.");
  if (note.length > CONTRACT_NOTE_MAX_LENGTH) throw new InputError(`Notes can be at most ${CONTRACT_NOTE_MAX_LENGTH} characters.`);

  const actor = actorOf(req);
  const contract = await uploadItemFile(CONTRACT_COLUMN, applicationId, {
    file,
    documentType: documentTypeKey,
    note,
    uploader: { id: String(req.user.sub), name: actor.name, role: req.user.role },
  });

  logFileActivity(actor, applicationId, `${actor.name} uploaded ${documentType.label.toLowerCase()} "${file.originalname}"`, {
    applicationId,
    assetId: contract.assetId,
    fileName: file.originalname,
    documentType: documentTypeKey,
  });

  let statusChanges = {};

  try {
    statusChanges = await markStatus(actor, applicationId, documentType);
  } catch (err) {
    console.error("Contracts: couldn't update the contract status.", err.message);
  }

  return { contract, statusChanges };
}

async function deleteContract(req) {
  const { id: applicationId, assetId } = req.params;
  const target = await deleteItemFile(CONTRACT_COLUMN, applicationId, assetId);
  const actor = actorOf(req);

  logFileActivity(actor, applicationId, `${actor.name} deleted "${target.name}"`, { applicationId, assetId, fileName: target.name });

  return { deleted: assetId };
}

export function registerContractRoutes(app, { requireAuth }) {
  const allowed = requireApplicationAccess("contracts");

  app.get("/api/applications/:id/contracts", requireAuth, allowed, (req, res) =>
    answer(res, listItemFiles(CONTRACT_COLUMN, req.params.id).then((contracts) => ({ contracts })), "contracts"),
  );

  app.post("/api/applications/:id/contracts", requireAuth, allowed, receiveFile, (req, res) => answer(res, uploadContract(req), "contracts"));

  app.delete("/api/applications/:id/contracts/:assetId", requireAuth, allowed, (req, res) => answer(res, deleteContract(req), "contracts"));
}
