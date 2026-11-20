import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../src/constants/statuses/postAdoptionStatuses.js";
import { isAdminRole } from "../../src/constants/roles.js";
import { requireApplicationAccess } from "../applicationAccess.js";
import { listItemFiles, uploadItemFile, deleteItemFile, receiveFile } from "../itemFiles.js";
import { answer, HttpError } from "../httpAnswer.js";
import { getItemSnapshot, getItemName, logActivity } from "../activityLog.js";
import { listActiveAccounts } from "../accountState.js";
import { notifyAssignmentChange, notifyUrgentEscalation } from "../notifications.js";
import { actorOf, logChanges, logCreated, InputError } from "../database/boardRecords.js";
import { isDatabaseEnabled } from "../database/db.js";
import { CHECK_INS, CHECK_IN_STATUS } from "../../src/constants/postAdoptionCheckIns.js";
import { MAX_ATTEMPTS } from "../../src/constants/postAdoptionReminders.js";
import { markSent, clearRow, chasedAgain, rowsOfRecord } from "./chaseStore.js";
import { POST_ADOPTION_FIELDS, TABLE, BOARD_ID, BOARD_NAME, PHOTOS_COLUMN_ID, isWritable } from "./fields.js";
import { withRules, initialValues } from "./rules.js";
import { postAdoptionStore } from "./store.js";
import { TESTIMONIAL_ACTION } from "../../src/constants/testimonials.js";
import { applyAction } from "./testimonialRules.js";
import { getTestimonial, saveTestimonial, removeTestimonial } from "./testimonialStore.js";

// An application's post-adoption record (the Post Adoption tab), in either
// storage (store.js) with the same rules (rules.js). Admins and the
// application's Case Owner only.
//
//   GET    /api/applications/:id/post-adoption                  { record | null, photos }
//   GET    /api/applications/:id/post-adoption/owner-options    who may be the owner
//   POST   /api/applications/:id/post-adoption                  start: { adoptionDate, arrivalDate? }
//   POST   /api/applications/:id/post-adoption/:recordId        changes (writable fields) -> { record, chase }
//   POST   /api/applications/:id/post-adoption/:recordId/chase  { checkIn } - chased again (attempt + 1) -> { record, chase }
//   POST   /api/applications/:id/post-adoption/:recordId/testimonial { action, text?, mayPublish? } -> { testimonial | null }
//   POST   /api/applications/:id/post-adoption/:recordId/photos multipart: file, note?
//   DELETE /api/applications/:id/post-adoption/:recordId/photos/:assetId
//
// The owner must be an active user who can open the application (an Admin
// or its Case Owner); they're told when made owner or taken off. Setting
// Escalation Required to Urgent tells the Case Owner and every Admin.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const { POST_ADOPTION_STATUS, ESCALATION_REQUIRED } = POST_ADOPTION_STATUS_OPTIONS;
const PHOTOS_COLUMN = { table: TABLE, boardId: BOARD_ID, columnId: PHOTOS_COLUMN_ID };
const ID_PATTERN = /^\d+$/;
const NOTE_MAX_LENGTH = 500;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function tabLink(applicationId) {
  return `/active-applications/${applicationId}?tab=post-adoption`;
}

async function caseOwnerIdOf(applicationId) {
  const snapshot = await getItemSnapshot(applicationId, A.CASE_OWNER, ACTIVE_APPLICATIONS.BOARD_ID);

  return snapshot?.linkedIds?.[0] ?? null;
}

// Active users who can open the application: Admins and its Case Owner.
async function ownerOptions(applicationId) {
  const caseOwnerId = await caseOwnerIdOf(applicationId);

  return listActiveAccounts()
    .filter((account) => isAdminRole(account.role) || account.id === caseOwnerId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The application's record, or a 404 when `recordId` isn't it.
async function recordOf(applicationId, recordId) {
  if (!ID_PATTERN.test(recordId ?? "")) throw new InputError("Invalid post-adoption id.");

  const record = await postAdoptionStore().getRecord(recordId);

  if (!record || record.linkedApplicationId !== String(applicationId)) {
    throw new HttpError(404, "That post-adoption record isn't on this application.");
  }

  return record;
}

// { [checkInKey]: { attempts, lastSentOn, ... } } for the check-ins being
// chased (chaseStore.js); empty without the database.
async function chaseOf(recordId) {
  if (!isDatabaseEnabled()) return {};

  try {
    return await rowsOfRecord(recordId);
  } catch (err) {
    console.error("Post-adoption: couldn't read the chase attempts.", err.message);

    return {};
  }
}

// A check-in whose status changed starts a new phase: marked Sent it is
// attempt 1, any other status ends its chasing. Never throws: the change is
// saved, and the reminders catch up (a Sent check-in with no row counts as
// attempt 1).
async function trackChase(before, after, date) {
  if (!isDatabaseEnabled()) return;

  for (const checkIn of CHECK_INS) {
    if (after[checkIn.statusField] === before[checkIn.statusField]) continue;

    try {
      if (after[checkIn.statusField] === CHECK_IN_STATUS.SENT) await markSent(after.id, checkIn.key, date);
      else await clearRow(after.id, checkIn.key);
    } catch (err) {
      console.error(`Post-adoption: couldn't update the chase of ${checkIn.key} on record ${after.id}.`, err.message);
    }
  }
}

// The record's testimonial request (testimonialStore.js), or null when there
// is none or the database is not available.
async function testimonialOf(recordId) {
  if (!isDatabaseEnabled()) return null;

  try {
    return await getTestimonial(recordId);
  } catch (err) {
    console.error("Post-adoption: couldn't read the testimonial.", err.message);

    return null;
  }
}

async function getPostAdoption(applicationId) {
  const record = await postAdoptionStore().findByApplication(applicationId);
  const photos = record ? await listItemFiles(PHOTOS_COLUMN, record.id) : [];

  return { record, photos, chase: record ? await chaseOf(record.id) : {}, testimonial: record ? await testimonialOf(record.id) : null };
}

async function startPostAdoption(req) {
  const applicationId = req.params.id;
  const { adoptionDate, arrivalDate } = req.body ?? {};
  const store = postAdoptionStore();

  if (!adoptionDate) throw new InputError("An adoption date is required.");

  if (await store.findByApplication(applicationId)) {
    throw new HttpError(409, "This application already has a post-adoption record.");
  }

  const [catSnapshot, citySnapshot] = await Promise.all([
    getItemSnapshot(applicationId, A.LINKED_CAT, ACTIVE_APPLICATIONS.BOARD_ID),
    getItemSnapshot(applicationId, A.CITY, ACTIVE_APPLICATIONS.BOARD_ID),
  ]);
  const applicationName = citySnapshot?.itemName || (await getItemName(applicationId)) || `Application ${applicationId}`;
  const values = initialValues({ adoptionDate, arrivalDate, activeStatus: POST_ADOPTION_STATUS.ACTIVE });

  if (citySnapshot?.columnText) values.city = citySnapshot.columnText;

  const record = await store.createPostAdoption({
    name: `${applicationName} - Post-Adoption`,
    values,
    applicationId,
    catId: catSnapshot?.linkedIds?.[0] ?? null,
  });

  logCreated({ actor: actorOf(req), table: TABLE, boardName: BOARD_NAME, record, raw: { applicationId, adoptionDate, arrivalDate: arrivalDate || null } });

  return { record, photos: [] };
}

async function changePostAdoption(req) {
  const { id: applicationId, recordId } = req.params;
  const requested = req.body ?? {};
  const keys = Object.keys(requested);

  if (!keys.length) throw new InputError("Nothing to change.");

  for (const key of keys) {
    if (!isWritable(key)) throw new InputError(`"${key}" can't be changed.`);
  }

  const before = await recordOf(applicationId, recordId);

  if ("ownerId" in requested && requested.ownerId !== null) {
    const allowed = await ownerOptions(applicationId);

    if (!allowed.some((account) => account.id === String(requested.ownerId))) {
      throw new InputError("The owner must be an active Admin or this application's Case Owner.");
    }
  }

  const changes = withRules(before, requested, today());
  const result = await postAdoptionStore().updatePostAdoption(recordId, changes);
  const { after } = result;
  const actor = actorOf(req);
  const target = { boardId: BOARD_ID, itemId: after.id, name: after.name || "a post-adoption" };

  logChanges({ actor, table: TABLE, boardName: BOARD_NAME, fields: POST_ADOPTION_FIELDS, before, after, keys: Object.keys(changes) });

  await trackChase(before, after, today());

  if (before.ownerId !== after.ownerId) {
    notifyAssignmentChange({
      kind: "postAdoption",
      previousIds: before.ownerId ? [before.ownerId] : [],
      nextIds: after.ownerId ? [after.ownerId] : [],
      actor,
      target,
      link: tabLink(applicationId),
    });
  }

  if (after.escalationRequired === ESCALATION_REQUIRED.URGENT && before.escalationRequired !== ESCALATION_REQUIRED.URGENT) {
    const caseOwnerId = await caseOwnerIdOf(applicationId);
    const admins = listActiveAccounts().filter((account) => isAdminRole(account.role)).map((account) => account.id);

    notifyUrgentEscalation({ recipientIds: [...admins, ...(caseOwnerId ? [caseOwnerId] : [])], actor, target, link: tabLink(applicationId) });
  }

  return { record: after, chase: await chaseOf(after.id) };
}

// "Chased again": the adopter was contacted once more about a check-in that
// is still Sent and unanswered. One more attempt, today's date as the last
// check-in sent, and the chase count goes up (the same as marking it Sent).
// After MAX_ATTEMPTS attempts there is nothing more to chase: a reply is
// awaited, and the reminders stop chasing if none comes.
async function chasePostAdoption(req) {
  const { id: applicationId, recordId } = req.params;
  const checkIn = CHECK_INS.find((entry) => entry.key === req.body?.checkIn);

  if (!checkIn) throw new InputError("Unknown check-in.");
  if (!isDatabaseEnabled()) throw new HttpError(503, "Chasing needs the app's database, which isn't set up on this server.");

  const before = await recordOf(applicationId, recordId);

  if (before[checkIn.statusField] !== CHECK_IN_STATUS.SENT) throw new InputError(`The ${checkIn.label} check-in isn't waiting for a reply (it must be Sent).`);

  const attempts = (await rowsOfRecord(recordId))[checkIn.key]?.attempts || 1;

  if (attempts >= MAX_ATTEMPTS) throw new InputError(`The ${checkIn.label} check-in has already had ${MAX_ATTEMPTS} attempts.`);

  await chasedAgain(recordId, checkIn.key, today());

  const changes = { lastCheckInSent: today(), chaseCount: (Number(before.chaseCount) || 0) + 1 };
  const { after } = await postAdoptionStore().updatePostAdoption(recordId, changes);

  logChanges({ actor: actorOf(req), table: TABLE, boardName: BOARD_NAME, fields: POST_ADOPTION_FIELDS, before, after, keys: Object.keys(changes) });
  logActivity({
    actorId: actorOf(req).id,
    actorName: actorOf(req).name,
    boardId: BOARD_ID,
    boardName: BOARD_NAME,
    itemId: after.id,
    itemName: after.name,
    actionType: "Updated",
    description: `${actorOf(req).name} chased the ${checkIn.label} check-in again (attempt ${attempts + 1} of ${MAX_ATTEMPTS}) on ${after.name}`,
    fieldChanged: checkIn.label,
  });

  return { record: after, chase: await chaseOf(after.id) };
}

const TESTIMONIAL_ACTIVITY = {
  [TESTIMONIAL_ACTION.REQUEST]: "requested a testimonial",
  [TESTIMONIAL_ACTION.CHASE]: "asked again for a testimonial",
  [TESTIMONIAL_ACTION.RECEIVE]: "recorded the testimonial",
  [TESTIMONIAL_ACTION.DECLINE]: "marked the testimonial as declined",
  [TESTIMONIAL_ACTION.UPDATE]: "edited the testimonial",
  [TESTIMONIAL_ACTION.RESET]: "reset the testimonial request",
};

// One step of the testimonial request: { action, text?, mayPublish? } (see
// testimonialRules.js). The text is never written to the activity log.
async function changeTestimonial(req) {
  const { id: applicationId, recordId } = req.params;
  const { action, ...input } = req.body ?? {};

  if (!isDatabaseEnabled()) throw new HttpError(503, "Testimonials need the app's database, which isn't set up on this server.");

  const record = await recordOf(applicationId, recordId);
  const next = applyAction(await getTestimonial(recordId), action, input, today());
  const actor = actorOf(req);
  const saved = next ? await saveTestimonial(recordId, next, actor.name) : null;

  if (!next) await removeTestimonial(recordId);

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: BOARD_ID,
    boardName: BOARD_NAME,
    itemId: record.id,
    itemName: record.name,
    actionType: "Updated",
    description: `${actor.name} ${TESTIMONIAL_ACTIVITY[action]} on ${record.name}`,
    fieldChanged: "Testimonial",
  });

  return { testimonial: saved };
}

function logPhotoActivity(actor, record, description, raw) {
  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: BOARD_ID,
    boardName: BOARD_NAME,
    itemId: record.id,
    itemName: record.name,
    actionType: "Updated",
    description: `${description} on ${record.name}`,
    fieldChanged: "Photos / Videos Received",
    raw,
  });
}

async function uploadPhoto(req) {
  const record = await recordOf(req.params.id, req.params.recordId);
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

  if (!req.file) throw new InputError("A file is required.");
  if (note.length > NOTE_MAX_LENGTH) throw new InputError(`Notes can be at most ${NOTE_MAX_LENGTH} characters.`);

  const actor = actorOf(req);
  const photo = await uploadItemFile(PHOTOS_COLUMN, record.id, {
    file: req.file,
    note,
    uploader: { id: String(req.user.sub), name: actor.name, role: req.user.role },
  });

  logPhotoActivity(actor, record, `${actor.name} uploaded "${req.file.originalname}"`, { assetId: photo.assetId, fileName: req.file.originalname });

  return { photo };
}

async function deletePhoto(req) {
  const record = await recordOf(req.params.id, req.params.recordId);
  const target = await deleteItemFile(PHOTOS_COLUMN, record.id, req.params.assetId);
  const actor = actorOf(req);

  logPhotoActivity(actor, record, `${actor.name} deleted "${target.name}"`, { assetId: target.assetId, fileName: target.name });

  return { deleted: target.assetId };
}

export function registerPostAdoptionRoutes(app, { requireAuth }) {
  const allowed = requireApplicationAccess("post-adoption");
  const base = "/api/applications/:id/post-adoption";

  app.get(base, requireAuth, allowed, (req, res) => answer(res, getPostAdoption(req.params.id), "post-adoption"));

  app.get(`${base}/owner-options`, requireAuth, allowed, (req, res) =>
    answer(res, ownerOptions(req.params.id).then((users) => ({ users })), "post-adoption"),
  );

  app.post(base, requireAuth, allowed, (req, res) => answer(res, startPostAdoption(req), "post-adoption"));

  app.post(`${base}/:recordId`, requireAuth, allowed, (req, res) => answer(res, changePostAdoption(req), "post-adoption"));

  app.post(`${base}/:recordId/chase`, requireAuth, allowed, (req, res) => answer(res, chasePostAdoption(req), "post-adoption"));

  app.post(`${base}/:recordId/testimonial`, requireAuth, allowed, (req, res) => answer(res, changeTestimonial(req), "post-adoption"));

  app.post(`${base}/:recordId/photos`, requireAuth, allowed, receiveFile, (req, res) => answer(res, uploadPhoto(req), "post-adoption"));

  app.delete(`${base}/:recordId/photos/:assetId`, requireAuth, allowed, (req, res) => answer(res, deletePhoto(req), "post-adoption"));
}
