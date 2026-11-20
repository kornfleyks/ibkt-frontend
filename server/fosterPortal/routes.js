import { CATS } from "../../src/constants/boards/cats.js";
import { USERS } from "../../src/constants/boards/users.js";
import { FOSTERS } from "../../src/constants/boards/fosters.js";
import { FOSTERS_STATUS_OPTIONS } from "../../src/constants/statuses/fostersStatuses.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/notificationsStatuses.js";
import { ROLES, isStaffRole } from "../../src/constants/roles.js";
import { FOSTER_FILE_RULES, FOSTER_FILE_KINDS, missingFiles } from "../../src/constants/fosterPortal.js";
import { PROFILE_FORM_ID, WORDING_VERSION, profileAnswersErrors, cleanProfileAnswers } from "../../src/constants/forms/fosterProfileForm.js";
import { query, ident } from "../database/db.js";
import { isDatabaseBoard } from "../database/switches.js";
import { boardFields } from "../database/boardStore.js";
import { InputError, actorOf } from "../database/boardRecords.js";
import { listCats, getCat } from "../cats.js";
import { listItemFiles, uploadItemFile, deleteItemFile, receiveFile } from "../itemFiles.js";
import { answer, HttpError } from "../httpAnswer.js";
import { listActiveAccounts } from "../accountState.js";
import { createNotification } from "../notifications.js";
import { logActivity } from "../activityLog.js";
import { insertProfile, latestProfiles } from "./store.js";

// The foster portal's server side (docs/foster-onboarding.md): what a signed-in
// Foster may do with the cats assigned to them.
//
//   GET    /api/foster-portal/cats                  their cats, with the state of the newest profile
//   GET    /api/foster-portal/cats/:id              one cat, the files sent so far and the newest profile
//   POST   /api/foster-portal/cats/:id/files        multipart { kind, file }: photos | videos | passport | vetReport
//   DELETE /api/foster-portal/cats/:id/files/:assetId
//   POST   /api/foster-portal/cats/:id/profile      { answers }: sends the Kitty Profile for review
//
// Fosters are refused everywhere else (requireAuth), so these use requireAnyAuth
// and check the role themselves. Who the foster is comes from their login
// (Users > Linked Foster), never from the request, so nobody can list, upload
// to or send a profile for a cat that is not assigned to them. The files wait in
// the cat's Foster Uploads (pending) column on Monday, with their kind recorded
// in file_uploads, until staff apply the submission; while a profile is waiting
// for review the files cannot be changed.

const U = USERS.COLUMNS;
const F = FOSTERS.COLUMNS;
export const PENDING_FILES = { table: "cats", boardId: CATS.BOARD_ID, columnId: CATS.COLUMNS.FOSTER_UPLOADS };
const ID_PATTERN = /^\d+$/;
const MAX_FILES_PER_CAT = 25;
const { TYPE } = NOTIFICATIONS_STATUS_OPTIONS;

function onlyFosters(req, res, next) {
  if (req.user?.role !== ROLES.FOSTER) return res.status(403).json({ error: "Only fosters can use this." });

  next();
}

function onlyInDatabase(req, res, next) {
  if (["cats", "users", "fosters"].every((table) => isDatabaseBoard(table))) return next();

  res.status(409).json({ error: "The foster portal needs Cats, Users and Fosters kept in the database." });
}

// The Fosters record linked to the signed-in foster's login, which must still
// be Active (staff can switch a foster off).
async function myFosterId(req) {
  const users = await boardFields("users");
  const { rows } = await query(`select ${ident(users.field(U.LINKED_FOSTER))} as ids from ${ident(users.table)} where monday_item_id = $1`, [Number(req.user.sub)]);
  const id = rows[0]?.ids?.[0];

  if (id === undefined || id === null) throw new HttpError(403, "Your account isn't linked to a foster record. Contact IBKT.");

  const fosters = await boardFields("fosters");
  const found = await query(`select ${ident(fosters.field(F.STATUS))} as status from ${ident(fosters.table)} where monday_item_id = $1`, [Number(id)]);

  if (found.rows[0]?.status !== FOSTERS_STATUS_OPTIONS.STATUS.ACTIVE) throw new HttpError(403, "Your foster record isn't active. Contact IBKT.");

  return String(id);
}

// The cat, when it is assigned to the signed-in foster; 404 for any other cat.
async function ownCat(req, fosterId) {
  if (!ID_PATTERN.test(String(req.params.id))) throw new HttpError(404, "Cat not found.");

  const cat = await getCat(req.params.id);

  if (!cat || String(cat.linkedFosterId ?? "") !== fosterId) throw new HttpError(404, "Cat not found.");

  return cat;
}

function profileSummary(profile) {
  return profile ? { id: profile.id, status: profile.status, submittedAt: profile.submittedAt, rejectReason: profile.rejectReason } : null;
}

// The files in the pending column as the portal shows them (no links: a
// foster has no Monday login).
async function pendingFiles(catId) {
  const files = await listItemFiles(PENDING_FILES, catId);

  return files
    .filter((file) => FOSTER_FILE_KINDS.includes(file.documentType))
    .map((file) => ({ assetId: file.assetId, name: file.name, kind: file.documentType, sizeBytes: file.sizeBytes, uploadedAt: file.uploadedAt }));
}

function countsOf(files) {
  return Object.fromEntries(FOSTER_FILE_KINDS.map((kind) => [kind, files.filter((file) => file.kind === kind).length]));
}

async function getMyCats(req) {
  const fosterId = await myFosterId(req);
  const cats = (await listCats()).filter((cat) => String(cat.linkedFosterId ?? "") === fosterId);
  const profiles = await latestProfiles(cats.map((cat) => cat.id));

  return cats
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .map((cat) => ({ id: cat.id, name: cat.name, status: cat.status, profile: profileSummary(profiles.get(cat.id)) }));
}

async function getMyCat(req) {
  const fosterId = await myFosterId(req);
  const cat = await ownCat(req, fosterId);
  const [files, profiles] = await Promise.all([pendingFiles(cat.id), latestProfiles([cat.id])]);

  return { cat: { id: cat.id, name: cat.name, status: cat.status, gender: cat.gender, age: cat.age }, files, counts: countsOf(files), profile: profileSummary(profiles.get(cat.id)) };
}

// Files cannot change while a profile is waiting for review: the staff are
// looking at exactly those files.
async function refuseWhileWaiting(catId) {
  const profile = (await latestProfiles([catId])).get(catId);

  if (profile?.status === "Pending") throw new HttpError(409, "Your profile for this cat is waiting for review, so its files can't be changed now.");
}

function logFosterActivity(req, cat, description, fieldChanged, raw) {
  const actor = actorOf(req);

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: CATS.BOARD_ID,
    boardName: "Cats",
    itemId: cat.id,
    itemName: cat.name,
    actionType: "Updated",
    description: `${actor.name} (foster) ${description} ${cat.name}`,
    fieldChanged,
    raw,
  });
}

async function uploadMyFile(req) {
  const fosterId = await myFosterId(req);
  const cat = await ownCat(req, fosterId);
  const kind = req.body?.kind;
  const file = req.file;
  const rule = FOSTER_FILE_RULES[kind];

  if (!rule) throw new InputError(`kind must be ${FOSTER_FILE_KINDS.join(", ")}.`);
  if (!file) throw new InputError("A file is required.");

  await refuseWhileWaiting(cat.id);

  const extension = file.originalname.split(".").pop()?.toLowerCase();
  const existing = await pendingFiles(cat.id);

  if (!rule.extensions.includes(extension)) throw new InputError(`Allowed file types: ${rule.extensions.join(", ")}.`);
  if (file.size > rule.maxBytes) throw new InputError(`That file is larger than ${rule.maxBytes / (1024 * 1024)} MB.`);
  if (existing.filter((entry) => entry.kind === kind).length >= rule.max) throw new InputError(`You can add up to ${rule.max} ${rule.label.toLowerCase()} per cat.`);
  if (existing.length >= MAX_FILES_PER_CAT) throw new InputError(`You can send up to ${MAX_FILES_PER_CAT} files per cat.`);

  const actor = actorOf(req);
  let saved;

  try {
    saved = await uploadItemFile(PENDING_FILES, cat.id, { file, documentType: kind, uploader: { id: String(req.user.sub), name: actor.name, role: ROLES.FOSTER } });
  } catch (err) {
    if (err.rateLimited) throw err;
    if (err.mondayErrors) throw new HttpError(502, "Monday couldn't accept that file. Try again.");

    throw err;
  }

  logFosterActivity(req, cat, `uploaded a ${rule.label.toLowerCase()} file for`, "Foster Uploads (pending)", { itemId: cat.id, fileName: file.originalname, kind });

  return { file: { assetId: saved.assetId, name: saved.name ?? file.originalname, kind, sizeBytes: saved.sizeBytes ?? file.size } };
}

async function deleteMyFile(req) {
  const fosterId = await myFosterId(req);
  const cat = await ownCat(req, fosterId);

  if (!ID_PATTERN.test(String(req.params.assetId))) throw new HttpError(404, "That file isn't on this cat.");

  await refuseWhileWaiting(cat.id);

  const mine = (await pendingFiles(cat.id)).find((file) => file.assetId === String(req.params.assetId));

  if (!mine) throw new HttpError(404, "That file isn't on this cat.");

  await deleteItemFile(PENDING_FILES, cat.id, mine.assetId);
  logFosterActivity(req, cat, "removed a file they had uploaded for", "Foster Uploads (pending)", { itemId: cat.id, fileName: mine.name, kind: mine.kind });

  return { deleted: mine.assetId };
}

// Tells the staff (Admins, Super Admins and Volunteers) that a profile is waiting.
function notifyStaff(req, cat, fosterName) {
  const actor = actorOf(req);

  for (const account of listActiveAccounts().filter((entry) => isStaffRole(entry.role))) {
    createNotification({
      recipientId: account.id,
      type: TYPE.FOSTER_PROFILE,
      message: `${fosterName} sent a Kitty Profile for ${cat.name}`,
      actor,
      target: { boardId: CATS.BOARD_ID, itemId: cat.id, name: cat.name },
      link: `/cats/${cat.id}`,
    });
  }
}

async function sendMyProfile(req) {
  const fosterId = await myFosterId(req);
  const cat = await ownCat(req, fosterId);
  const answers = req.body?.answers;

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new InputError("The profile answers are missing.");

  const errors = profileAnswersErrors(answers);

  if (Object.keys(errors).length > 0) {
    const err = new InputError("Some answers are missing or invalid.");

    err.fields = errors;
    throw err;
  }

  await refuseWhileWaiting(cat.id);

  const files = await pendingFiles(cat.id);
  const missing = missingFiles(countsOf(files));

  if (missing.length > 0) throw new InputError(`Add the missing files first: ${missing.map((item) => `${item.label} (${item.have} of ${item.need})`).join(", ")}.`);

  const saved = await insertProfile({
    catId: cat.id,
    userId: req.user.sub,
    fosterId,
    answers: { formId: PROFILE_FORM_ID, ...cleanProfileAnswers(answers) },
    files: files.map(({ assetId, name, kind, sizeBytes }) => ({ assetId, name, kind, sizeBytes })),
    wordingVersion: WORDING_VERSION,
  });

  if (!saved) throw new HttpError(409, "Your profile for this cat is already waiting for review.");

  const actor = actorOf(req);

  logFosterActivity(req, cat, "sent a Kitty Profile for", "Kitty Profile", { itemId: cat.id, profileId: saved.id });
  notifyStaff(req, cat, actor.name);

  return { profile: profileSummary(saved) };
}

export function registerFosterPortalRoutes(app, { requireAnyAuth }) {
  const guard = [requireAnyAuth, onlyFosters, onlyInDatabase];

  app.get("/api/foster-portal/cats", ...guard, (req, res) => answer(res, getMyCats(req), "foster portal"));

  app.get("/api/foster-portal/cats/:id", ...guard, (req, res) => answer(res, getMyCat(req), "foster portal"));

  app.post("/api/foster-portal/cats/:id/files", ...guard, receiveFile, (req, res) => answer(res, uploadMyFile(req), "foster portal"));

  app.delete("/api/foster-portal/cats/:id/files/:assetId", ...guard, (req, res) => answer(res, deleteMyFile(req), "foster portal"));

  app.post("/api/foster-portal/cats/:id/profile", ...guard, (req, res) => answer(res, sendMyProfile(req), "foster portal"));
}
