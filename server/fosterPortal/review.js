import { CATS } from "../../src/constants/boards/cats.js";
import { FOSTER_FILE_KINDS } from "../../src/constants/fosterPortal.js";
import { PROFILE_FORM_ID } from "../../src/constants/forms/fosterProfileForm.js";
import { isDatabaseBoard } from "../database/switches.js";
import { InputError, actorOf } from "../database/boardRecords.js";
import { userById } from "../database/usersStore.js";
import { refreshFileCopy } from "../database/fileCopies.js";
import * as uploads from "../database/fileUploadsStore.js";
import { getCat, changeCat } from "../cats.js";
import { listItemFiles } from "../itemFiles.js";
import { filesOf, readFileColumn, setColumnFiles } from "../mondayFiles.js";
import { clearCache } from "../mondayCache.js";
import { answer, HttpError } from "../httpAnswer.js";
import { logActivity } from "../activityLog.js";
import { PENDING_FILES } from "./routes.js";
import { APPLY_FIELDS, APPLY_KEYS, LONG_TEXT_LIMIT, proposeFields } from "./mapping.js";
import { getProfile, listProfilesOfCat, claimProfile, releaseProfile, markApplied, markRejected, alreadyCopied, copyNote } from "./store.js";

// Staff review of the Kitty Profiles fosters send (docs/foster-onboarding.md,
// phase 5), on the cat page. Any staff role that can open the cat.
//
//   GET  /api/cats/:id/foster-profiles                       every profile sent for the cat, newest first
//   GET  /api/cats/:id/foster-profiles/:profileId/proposal   what Apply would change: [{ key, label, current, proposed, ... }]
//   POST /api/cats/:id/foster-profiles/:profileId/apply      { fields: { key: value }, files: true | false }
//   POST /api/cats/:id/foster-profiles/:profileId/reject     { reason }
//
// Apply changes only the cat fields the staff member chose (and may have edited),
// then copies the foster's files from the cat's Foster Uploads (pending) column
// into the cat's own columns and clears the pending ones. Reject keeps the files,
// so the foster can fix the profile and send it again. Both can be repeated after
// a failure half way: a file that was already copied is not copied twice.

const C = CATS.COLUMNS;
const ID_PATTERN = /^\d+$/;
const MAX_REASON = 1000;

// Where each kind of file goes on the cat.
const TARGET_COLUMNS = { photos: C.PHOTOS, videos: C.VIDEOS, passport: C.PASSPORT_FILE, vetReport: C.MEDICAL_DOCUMENTS };

function onlyInDatabase(req, res, next) {
  if (["cats", "users", "fosters"].every((table) => isDatabaseBoard(table))) return next();

  res.status(409).json({ error: "Foster profiles need Cats, Users and Fosters kept in the database." });
}

async function catAndProfile(req) {
  const { id, profileId } = req.params;

  if (!ID_PATTERN.test(id ?? "")) throw new HttpError(404, "Cat not found.");

  const cat = await getCat(id);

  if (!cat) throw new HttpError(404, "Cat not found.");
  if (profileId === undefined) return { cat };

  const profile = ID_PATTERN.test(profileId) ? await getProfile(profileId) : null;

  if (!profile || profile.catId !== String(cat.id)) throw new HttpError(404, "That profile isn't on this cat.");

  return { cat, profile };
}

async function fosterNameOf(userId) {
  const user = await userById(userId).catch(() => null);

  return user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "A foster" : "A foster";
}

// The profile as staff see it. The files of a waiting profile are still in the
// pending column, so they come with their links (staff have a Monday login);
// after Apply the files are the cat's own, so only their names remain.
async function describe(profile, pendingByAsset) {
  return {
    id: profile.id,
    status: profile.status,
    fosterName: await fosterNameOf(profile.userId),
    submittedAt: profile.submittedAt,
    reviewedByName: profile.reviewedByName,
    reviewedAt: profile.reviewedAt,
    rejectReason: profile.rejectReason,
    appliedFields: profile.appliedFields,
    wordingVersion: profile.wordingVersion,
    answers: profile.answers,
    files: profile.files.map((file) => ({ ...file, url: pendingByAsset.get(file.assetId)?.url ?? null })),
  };
}

async function listFosterProfiles(req) {
  const { cat } = await catAndProfile(req);
  const profiles = await listProfilesOfCat(cat.id);
  const pending = profiles.some((profile) => profile.status !== "Applied")
    ? new Map((await listItemFiles(PENDING_FILES, cat.id)).map((file) => [file.assetId, file]))
    : new Map();

  return { profiles: await Promise.all(profiles.map((profile) => describe(profile, pending))) };
}

async function getProposal(req) {
  const { cat, profile } = await catAndProfile(req);

  if (profile.status !== "Pending") throw new HttpError(409, `This profile is already ${profile.status}.`);

  return { fields: proposeFields(profile.answers, cat, profile.submittedAt) };
}

// The cat fields to change, checked: only the profile's fields, a select within
// its options, a text that Monday will keep whole.
function cleanChanges(fields) {
  if (fields === undefined) return {};
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new InputError("fields must be an object.");

  const changes = {};

  for (const [key, value] of Object.entries(fields)) {
    const spec = APPLY_FIELDS[key];

    if (!spec) throw new InputError(`"${key}" can't be changed from a profile (allowed: ${APPLY_KEYS.join(", ")}).`);
    if (typeof value !== "string") throw new InputError(`${spec.label} must be text.`);

    const clean = value.trim();

    if (!clean) throw new InputError(`${spec.label} can't be empty.`);
    if (spec.kind === "select" && !spec.options.includes(clean)) throw new InputError(`${spec.label} must be one of: ${spec.options.join(", ")}.`);
    if (spec.kind === "text" && clean.length > LONG_TEXT_LIMIT) {
      throw new InputError(`${spec.label} can be at most ${LONG_TEXT_LIMIT} characters (it is ${clean.length}). Monday keeps no more, so shorten it.`);
    }

    changes[key] = clean;
  }

  return changes;
}

// Copies the profile's files into the cat's own columns and clears them from the
// pending column. Answers how many were copied. Safe to run again.
async function moveFiles(profile, cat) {
  const inPending = new Map(filesOf(await readFileColumn(cat.id, PENDING_FILES.columnId)).map((file) => [file.assetId, file]));
  const wanted = profile.files.filter((file) => inPending.has(file.assetId));
  const copiedBefore = await alreadyCopied(cat.id, profile.id, profile.files.map((file) => file.assetId));
  const records = await uploads.uploadsOf(profile.files.map((file) => file.assetId));
  let copied = 0;

  for (const kind of FOSTER_FILE_KINDS) {
    const targetColumn = TARGET_COLUMNS[kind];
    const toCopy = wanted.filter((file) => file.kind === kind && !copiedBefore.has(file.assetId));

    if (toCopy.length > 0) {
      const existing = filesOf(await readFileColumn(cat.id, targetColumn));
      const keep = existing.map(({ assetId, name }) => ({ assetId, name }));

      // Monday copies each file into the new column with a new asset id.
      await setColumnFiles(CATS.BOARD_ID, cat.id, targetColumn, [...keep, ...toCopy.map(({ assetId, name }) => ({ assetId, name }))]);

      const known = new Set(existing.map((file) => file.assetId));
      const fresh = filesOf(await readFileColumn(cat.id, targetColumn)).filter((file) => !known.has(file.assetId));

      for (const old of toCopy) {
        const index = fresh.findIndex((file) => file.name === old.name);

        if (index < 0) continue;

        const [created] = fresh.splice(index, 1);
        const record = records.get(old.assetId);

        await uploads.recordUpload({
          assetId: created.assetId,
          boardId: CATS.BOARD_ID,
          itemId: cat.id,
          columnId: targetColumn,
          fileName: old.name,
          sizeBytes: old.sizeBytes ?? record?.sizeBytes ?? null,
          mimeType: record?.mimeType ?? null,
          documentType: null,
          note: copyNote(profile.id, old.assetId),
          uploadedBy: record?.uploadedBy ?? { id: profile.userId, name: "Foster", role: "Foster" },
        });
        copied += 1;
      }
    }

    await refreshFileCopy(cat.id, targetColumn);
  }

  // The pending column keeps only what is not part of this profile.
  const leftover = [...inPending.values()].filter((file) => !profile.files.some((sent) => sent.assetId === file.assetId));

  await setColumnFiles(CATS.BOARD_ID, cat.id, PENDING_FILES.columnId, leftover.map(({ assetId, name }) => ({ assetId, name })));

  for (const file of profile.files) await uploads.deleteUpload(file.assetId).catch((err) => console.error("Foster profile: couldn't remove an upload record.", err.message));

  await refreshFileCopy(cat.id, PENDING_FILES.columnId);
  clearCache([CATS.BOARD_ID]);

  return copied;
}

function logReview(actor, cat, description, raw) {
  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: CATS.BOARD_ID,
    boardName: "Cats",
    itemId: cat.id,
    itemName: cat.name,
    actionType: "Updated",
    description: `${actor.name} ${description} ${cat.name}`,
    fieldChanged: "Foster Kitty Profile",
    raw,
  });
}

async function applyProfile(req) {
  const { cat, profile } = await catAndProfile(req);
  const body = req.body ?? {};

  if (profile.status !== "Pending") throw new HttpError(409, `This profile is already ${profile.status}.`);

  const changes = cleanChanges(body.fields);
  const withFiles = body.files !== false;

  if (!(await claimProfile(profile.id))) throw new HttpError(409, "This profile is being handled. Try again in a minute.");

  const actor = actorOf(req);
  let released = false;

  try {
    // The fields first: a refusal of a value ends it before any file is touched.
    if (Object.keys(changes).length > 0) await changeCat(actor, cat.id, changes);

    const copied = withFiles ? await moveFiles(profile, cat) : 0;

    await markApplied(profile.id, { reviewer: actor, appliedFields: Object.keys(changes) });
    released = true;
    logReview(actor, cat, `applied ${await fosterNameOf(profile.userId)}'s Kitty Profile (${Object.keys(changes).length} fields, ${copied} files) to`, {
      profileId: profile.id,
      fields: Object.keys(changes),
      files: copied,
      formId: PROFILE_FORM_ID,
    });

    return { ok: true, applied: Object.keys(changes), files: copied };
  } finally {
    if (!released) await releaseProfile(profile.id).catch(() => {});
  }
}

async function rejectProfile(req) {
  const { cat, profile } = await catAndProfile(req);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

  if (!reason) throw new InputError("Give a reason. The foster sees it.");
  if (reason.length > MAX_REASON) throw new InputError(`Keep the reason under ${MAX_REASON} characters.`);
  if (profile.status !== "Pending") throw new HttpError(409, `This profile is already ${profile.status}.`);
  if (!(await claimProfile(profile.id))) throw new HttpError(409, "This profile is being handled. Try again in a minute.");

  const actor = actorOf(req);
  let released = false;

  try {
    await markRejected(profile.id, { reviewer: actor, reason });
    released = true;
    logReview(actor, cat, `sent back ${await fosterNameOf(profile.userId)}'s Kitty Profile for`, { profileId: profile.id });

    return { ok: true };
  } finally {
    if (!released) await releaseProfile(profile.id).catch(() => {});
  }
}

export function registerFosterReviewRoutes(app, { requireAuth }) {
  const guard = [requireAuth, onlyInDatabase];
  const base = "/api/cats/:id/foster-profiles";

  app.get(base, ...guard, (req, res) => answer(res, listFosterProfiles(req), "foster profiles"));

  app.get(`${base}/:profileId/proposal`, ...guard, (req, res) => answer(res, getProposal(req), "foster profiles"));

  app.post(`${base}/:profileId/apply`, ...guard, (req, res) => answer(res, applyProfile(req), "foster profiles"));

  app.post(`${base}/:profileId/reject`, ...guard, (req, res) => answer(res, rejectProfile(req), "foster profiles"));
}
