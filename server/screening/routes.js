import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { requireApplicationAccess } from "../applicationAccess.js";
import { listItemFiles, uploadItemFile, deleteItemFile, receiveFile } from "../itemFiles.js";
import { answer, HttpError } from "../httpAnswer.js";
import { logActivity, getItemName } from "../activityLog.js";
import { isDatabaseEnabled } from "../database/db.js";
import { actorOf, InputError } from "../database/boardRecords.js";
import * as transcripts from "./transcriptsStore.js";

// The application's Screening tab: call transcripts (uploaded files on the
// Call 1 / Call 2 Transcript columns on Monday; pasted text in the
// database) and the home video, each with who added it and when. Admins
// and the application's Case Owner only. /api/upload and /api/monday
// refuse these file columns (index.js).
//
//   GET    /api/applications/:id/screening
//          { calls: { 1: { files, texts }, 2: { files, texts } }, video: [files] }
//   POST   /api/applications/:id/screening/calls/:call/files        multipart: file, note?
//   DELETE /api/applications/:id/screening/calls/:call/files/:assetId
//   POST   /api/applications/:id/screening/calls/:call/texts        { text }
//   DELETE /api/applications/:id/screening/calls/:call/texts/:textId
//   POST   /api/applications/:id/screening/video                    multipart: file, note?
//   DELETE /api/applications/:id/screening/video/:assetId

const A = ACTIVE_APPLICATIONS.COLUMNS;
const BOARD_ID = ACTIVE_APPLICATIONS.BOARD_ID;
const TABLE = "applications";
const NOTE_MAX_LENGTH = 500;
const TRANSCRIPT_MAX_LENGTH = 300_000;

export const TRANSCRIPT_COLUMNS = { 1: A.CALL_1_TRANSCRIPT, 2: A.CALL_2_TRANSCRIPT };
export const VIDEO_COLUMN_ID = A.VIDEO;

const fileColumn = (columnId) => ({ table: TABLE, boardId: BOARD_ID, columnId });

function callOf(req) {
  const call = Number(req.params.call);

  if (call !== 1 && call !== 2) throw new InputError("The call must be 1 or 2.");

  return call;
}

function requireDatabase() {
  if (!isDatabaseEnabled()) throw new HttpError(503, "Pasted transcripts need the app's database, which isn't set up on this server.");
}

async function log(req, description, fieldChanged, raw) {
  const actor = actorOf(req);
  const itemName = (await getItemName(req.params.id)) || `item ${req.params.id}`;

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: BOARD_ID,
    boardName: "Active Applications",
    itemId: req.params.id,
    itemName,
    actionType: "Updated",
    description: `${actor.name} ${description} on ${itemName}`,
    fieldChanged,
    raw,
  });
}

function uploader(req) {
  return { id: String(req.user.sub), name: actorOf(req).name, role: req.user.role };
}

function noteOf(req) {
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

  if (note.length > NOTE_MAX_LENGTH) throw new InputError(`Notes can be at most ${NOTE_MAX_LENGTH} characters.`);

  return note;
}

async function getScreening(applicationId) {
  const [files1, files2, video, texts] = await Promise.all([
    listItemFiles(fileColumn(TRANSCRIPT_COLUMNS[1]), applicationId),
    listItemFiles(fileColumn(TRANSCRIPT_COLUMNS[2]), applicationId),
    listItemFiles(fileColumn(VIDEO_COLUMN_ID), applicationId),
    isDatabaseEnabled() ? transcripts.listTranscripts(applicationId) : [],
  ]);

  return {
    calls: {
      1: { files: files1, texts: texts.filter((text) => text.call === 1) },
      2: { files: files2, texts: texts.filter((text) => text.call === 2) },
    },
    video,
  };
}

async function uploadTranscriptFile(req) {
  const call = callOf(req);

  if (!req.file) throw new InputError("A file is required.");

  const file = await uploadItemFile(fileColumn(TRANSCRIPT_COLUMNS[call]), req.params.id, { file: req.file, note: noteOf(req), uploader: uploader(req) });

  log(req, `uploaded the Call ${call} transcript "${req.file.originalname}"`, `Call ${call} Transcript`, { assetId: file.assetId });

  return { file };
}

async function deleteTranscriptFile(req) {
  const call = callOf(req);
  const target = await deleteItemFile(fileColumn(TRANSCRIPT_COLUMNS[call]), req.params.id, req.params.assetId);

  log(req, `deleted the Call ${call} transcript "${target.name}"`, `Call ${call} Transcript`, { assetId: target.assetId });

  return { deleted: target.assetId };
}

async function addTranscriptText(req) {
  const call = callOf(req);
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

  requireDatabase();

  if (!text) throw new InputError("Paste the transcript text first.");
  if (text.length > TRANSCRIPT_MAX_LENGTH) throw new InputError(`Transcripts can be at most ${TRANSCRIPT_MAX_LENGTH.toLocaleString("en-GB")} characters.`);

  const transcript = await transcripts.addTranscript({ applicationId: req.params.id, call, text, by: uploader(req) });

  log(req, `pasted a Call ${call} transcript (${text.length.toLocaleString("en-GB")} characters)`, `Call ${call} Transcript`, { transcriptId: transcript.id });

  return { transcript };
}

async function deleteTranscriptText(req) {
  const call = callOf(req);

  requireDatabase();

  if (!/^\d+$/.test(req.params.textId ?? "")) throw new InputError("Invalid transcript id.");

  const removed = await transcripts.deleteTranscript({ applicationId: req.params.id, call, id: req.params.textId });

  if (!removed) throw new HttpError(404, "That transcript isn't on this call.");

  log(req, `deleted a pasted Call ${call} transcript`, `Call ${call} Transcript`, { transcriptId: removed.id });

  return { deleted: removed.id };
}

async function uploadVideo(req) {
  if (!req.file) throw new InputError("A file is required.");

  const file = await uploadItemFile(fileColumn(VIDEO_COLUMN_ID), req.params.id, { file: req.file, note: noteOf(req), uploader: uploader(req) });

  log(req, `uploaded the home video "${req.file.originalname}"`, "Video", { assetId: file.assetId });

  return { file };
}

async function deleteVideo(req) {
  const target = await deleteItemFile(fileColumn(VIDEO_COLUMN_ID), req.params.id, req.params.assetId);

  log(req, `deleted the home video "${target.name}"`, "Video", { assetId: target.assetId });

  return { deleted: target.assetId };
}

export function registerScreeningRoutes(app, { requireAuth }) {
  const allowed = requireApplicationAccess("screening");
  const base = "/api/applications/:id/screening";
  const run = (work) => (req, res) => answer(res, work(req), "screening");

  app.get(base, requireAuth, allowed, run((req) => getScreening(req.params.id)));

  app.post(`${base}/calls/:call/files`, requireAuth, allowed, receiveFile, run(uploadTranscriptFile));
  app.delete(`${base}/calls/:call/files/:assetId`, requireAuth, allowed, run(deleteTranscriptFile));
  app.post(`${base}/calls/:call/texts`, requireAuth, allowed, run(addTranscriptText));
  app.delete(`${base}/calls/:call/texts/:textId`, requireAuth, allowed, run(deleteTranscriptText));

  app.post(`${base}/video`, requireAuth, allowed, receiveFile, run(uploadVideo));
  app.delete(`${base}/video/:assetId`, requireAuth, allowed, run(deleteVideo));
}
