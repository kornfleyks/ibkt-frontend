import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { requireApplicationAccess } from "../applicationAccess.js";
import { listItemFiles, uploadItemFile, deleteItemFile, receiveFile } from "../itemFiles.js";
import { answer, HttpError } from "../httpAnswer.js";
import { logActivity, getItemName } from "../activityLog.js";
import { isDatabaseEnabled } from "../database/db.js";
import { actorOf, InputError } from "../database/boardRecords.js";
import * as transcripts from "./transcriptsStore.js";
import * as calls from "./callsStore.js";

// The application's Screening tab: call transcripts (uploaded files on
// Monday; pasted text in the database) and the home video, each with who
// added it and when. Admins and the application's Case Owner only.
// /api/upload and /api/monday refuse these file columns (index.js).
//
// Calls 1 and 2 have their own date, summary and transcript columns on the
// Applications board. Calls 3 and above ("extra calls", from the Add call
// button) keep date and summary in the application_calls table
// (callsStore.js) and their transcript files all in the Additional Call
// Transcripts column, each file's call in its document type ("call-3")
// (docs/screening-extra-calls.md).
//
//   GET    /api/applications/:id/screening
//          { calls: { 1: { files, texts }, 2: { files, texts } }, video: [files],
//            extraCalls: [{ call, date, summary, createdBy, createdAt, files, texts }] }
//   POST   /api/applications/:id/screening/calls                    adds the next extra call -> { call }
//   POST   /api/applications/:id/screening/calls/:call              { date?, summary? } (extra calls) -> { call }
//   DELETE /api/applications/:id/screening/calls/:call              an extra call, its files and pasted transcripts
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
const SUMMARY_MAX_LENGTH = 10_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// "2026-11-11" yes; "2026-02-31" and "11/11/2026" no (Date.parse accepts the former).
function isRealDate(text) {
  return DATE_PATTERN.test(text) && new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) === text;
}

export const TRANSCRIPT_COLUMNS = { 1: A.CALL_1_TRANSCRIPT, 2: A.CALL_2_TRANSCRIPT };
export const VIDEO_COLUMN_ID = A.VIDEO;

const fileColumn = (columnId) => ({ table: TABLE, boardId: BOARD_ID, columnId });
const isExtraCall = (call) => call >= calls.FIRST_EXTRA_CALL;
const documentTypeOf = (call) => `call-${call}`;

// The file column holding a call's transcript files.
function transcriptColumnOf(call) {
  if (!isExtraCall(call)) return fileColumn(TRANSCRIPT_COLUMNS[call]);

  if (!A.ADDITIONAL_CALL_TRANSCRIPTS) {
    throw new HttpError(503, "The Additional Call Transcripts column isn't set up on this server yet (scripts/createAdditionalCallTranscriptColumn.js).");
  }

  return fileColumn(A.ADDITIONAL_CALL_TRANSCRIPTS);
}

// A call's transcript files, newest first. For an extra call, only the files
// of that call (the column holds all of them).
export async function listCallFiles(applicationId, call) {
  const files = await listItemFiles(transcriptColumnOf(call), applicationId);

  return isExtraCall(call) ? files.filter((file) => file.documentType === documentTypeOf(call)) : files;
}

function callOf(req) {
  const call = Number(req.params.call);

  if (!Number.isInteger(call) || call < 1 || call > 2 + calls.MAX_EXTRA_CALLS) throw new InputError("That isn't a call number.");

  return call;
}

// Like callOf, but an extra call must exist on this application.
async function existingCallOf(req) {
  const call = callOf(req);

  if (isExtraCall(call)) {
    requireDatabase();

    if (!(await calls.getCall(req.params.id, call))) throw new HttpError(404, `Call ${call} isn't on this application.`);
  }

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
    extraCalls: await getExtraCalls(applicationId, texts),
  };
}

// The extra calls with their transcripts, in call order. Empty when the
// database isn't set up (extra calls live there).
async function getExtraCalls(applicationId, texts) {
  if (!isDatabaseEnabled()) return [];

  const list = await calls.listCalls(applicationId);

  if (list.length === 0) return [];

  const files = A.ADDITIONAL_CALL_TRANSCRIPTS ? await listItemFiles(fileColumn(A.ADDITIONAL_CALL_TRANSCRIPTS), applicationId) : [];

  return list.map((entry) => ({
    ...entry,
    files: files.filter((file) => file.documentType === documentTypeOf(entry.call)),
    texts: texts.filter((text) => text.call === entry.call),
  }));
}

async function addCall(req) {
  requireDatabase();

  let created;

  try {
    created = await calls.addCall({ applicationId: req.params.id, by: uploader(req) });
  } catch (err) {
    // Two people added a call at the same moment and both got the same number.
    if (err?.code === "23505") throw new HttpError(409, "Another call was just added. Reload the tab and try again.");

    throw err;
  }

  if (!created) throw new InputError(`An application can have at most ${calls.MAX_EXTRA_CALLS} extra calls.`);

  log(req, `added Call ${created.call}`, `Call ${created.call}`, { call: created.call });

  return { call: { ...created, files: [], texts: [] } };
}

async function updateCall(req) {
  const call = await existingCallOf(req);

  if (!isExtraCall(call)) throw new InputError("Calls 1 and 2 are edited as the application's own fields.");

  const changes = {};

  if (req.body?.date !== undefined) {
    const date = typeof req.body.date === "string" ? req.body.date.trim() : null;

    if (date === null || (date !== "" && !isRealDate(date))) throw new InputError("The date must be a real date, as YYYY-MM-DD.");

    changes.date = date;
  }

  if (req.body?.summary !== undefined) {
    if (typeof req.body.summary !== "string") throw new InputError("The summary must be text.");
    if (req.body.summary.length > SUMMARY_MAX_LENGTH) throw new InputError(`Summaries can be at most ${SUMMARY_MAX_LENGTH.toLocaleString("en-GB")} characters.`);

    changes.summary = req.body.summary.trim();
  }

  if (Object.keys(changes).length === 0) throw new InputError("Nothing to change.");

  const updated = await calls.updateCall({ applicationId: req.params.id, call, changes });

  log(req, `updated the ${Object.keys(changes).join(" and ")} of Call ${call}`, `Call ${call}`, { call, changed: Object.keys(changes) });

  return { call: updated };
}

async function deleteCall(req) {
  const call = await existingCallOf(req);

  if (!isExtraCall(call)) throw new InputError("Calls 1 and 2 can't be deleted.");

  // Its files first: they are on Monday, so a failure here leaves the call
  // (and the files still to remove) in place to try again.
  for (const file of await listCallFiles(req.params.id, call)) {
    await deleteItemFile(transcriptColumnOf(call), req.params.id, file.assetId);
  }

  await calls.deleteCall({ applicationId: req.params.id, call });

  log(req, `deleted Call ${call}`, `Call ${call}`, { call });

  return { deleted: call };
}

async function uploadTranscriptFile(req) {
  const call = await existingCallOf(req);

  if (!req.file) throw new InputError("A file is required.");

  const file = await uploadItemFile(transcriptColumnOf(call), req.params.id, {
    file: req.file,
    documentType: isExtraCall(call) ? documentTypeOf(call) : null,
    note: noteOf(req),
    uploader: uploader(req),
  });

  log(req, `uploaded the Call ${call} transcript "${req.file.originalname}"`, `Call ${call} Transcript`, { assetId: file.assetId });

  return { file };
}

async function deleteTranscriptFile(req) {
  const call = await existingCallOf(req);

  // The extra calls share one column: only a file of this call may go.
  if (isExtraCall(call) && !(await listCallFiles(req.params.id, call)).some((file) => file.assetId === String(req.params.assetId))) {
    throw new HttpError(404, `That file isn't on Call ${call}.`);
  }

  const target = await deleteItemFile(transcriptColumnOf(call), req.params.id, req.params.assetId);

  log(req, `deleted the Call ${call} transcript "${target.name}"`, `Call ${call} Transcript`, { assetId: target.assetId });

  return { deleted: target.assetId };
}

async function addTranscriptText(req) {
  const call = await existingCallOf(req);
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

  requireDatabase();

  if (!text) throw new InputError("Paste the transcript text first.");
  if (text.length > TRANSCRIPT_MAX_LENGTH) throw new InputError(`Transcripts can be at most ${TRANSCRIPT_MAX_LENGTH.toLocaleString("en-GB")} characters.`);

  const transcript = await transcripts.addTranscript({ applicationId: req.params.id, call, text, by: uploader(req) });

  log(req, `pasted a Call ${call} transcript (${text.length.toLocaleString("en-GB")} characters)`, `Call ${call} Transcript`, { transcriptId: transcript.id });

  return { transcript };
}

async function deleteTranscriptText(req) {
  const call = await existingCallOf(req);

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

  app.post(`${base}/calls`, requireAuth, allowed, run(addCall));
  app.post(`${base}/calls/:call`, requireAuth, allowed, run(updateCall));
  app.delete(`${base}/calls/:call`, requireAuth, allowed, run(deleteCall));

  app.post(`${base}/calls/:call/files`, requireAuth, allowed, receiveFile, run(uploadTranscriptFile));
  app.delete(`${base}/calls/:call/files/:assetId`, requireAuth, allowed, run(deleteTranscriptFile));
  app.post(`${base}/calls/:call/texts`, requireAuth, allowed, run(addTranscriptText));
  app.delete(`${base}/calls/:call/texts/:textId`, requireAuth, allowed, run(deleteTranscriptText));

  app.post(`${base}/video`, requireAuth, allowed, receiveFile, run(uploadVideo));
  app.delete(`${base}/video/:assetId`, requireAuth, allowed, run(deleteVideo));
}
