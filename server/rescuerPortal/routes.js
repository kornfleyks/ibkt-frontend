import multer from "multer";
import { contentMatchesExtension, notThatKindOfFile } from "../fileSignature.js";
import { CATS } from "../../src/constants/boards/cats.js";
import { USERS } from "../../src/constants/boards/users.js";
import { RESCUERS } from "../../src/constants/boards/rescuers.js";
import { CATS_STATUS_OPTIONS } from "../../src/constants/statuses/catsStatuses.js";
import { ROLES } from "../../src/constants/roles.js";
import { query, ident } from "../database/db.js";
import { isDatabaseBoard } from "../database/switches.js";
import { boardFields, StoreError } from "../database/boardStore.js";
import { InputError, actorOf, optionLabels, send } from "../database/boardRecords.js";
import { createCatFromInput, listCats, getCat, CREATE_FIELDS } from "../cats.js";
import { addFileToColumn } from "../mondayFiles.js";
import { refreshFileCopy } from "../database/fileCopies.js";
import { clearCache } from "../mondayCache.js";
import { logActivity } from "../activityLog.js";
import { PORTAL_FILE_RULES, NEW_CATS_PER_DAY } from "../../src/constants/rescuerPortal.js";

// The rescuer portal's server side (docs/rescuer-onboarding.md): what a
// signed-in Rescuer may do - add cats and see the ones they added.
//
//   GET  /api/rescuer-portal/options            { breed: [...], colour: [...] }
//   GET  /api/rescuer-portal/cats               their cats, read-only summaries
//   POST /api/rescuer-portal/cats               { name, ...allowed fields }
//   POST /api/rescuer-portal/cats/:id/files     multipart { kind, file }
//
// Rescuers are refused everywhere else (requireAuth), so these use
// requireAnyAuth and check the role themselves. Who the rescuer is comes
// from their login (Users > Linked Rescuer) - never from the request - so
// nobody can add to, list or upload to someone else's cats.

const U = USERS.COLUMNS;
const R = RESCUERS.COLUMNS;
const C = CATS.COLUMNS;
const STATUS = CATS_STATUS_OPTIONS.STATUS;
const ID_PATTERN = /^\d+$/;

// What a rescuer may fill in: the staff Add Cat fields except the rescuer
// link (always themselves). Status is always Intake.
const PORTAL_FIELDS = CREATE_FIELDS.filter((field) => field !== "rescuerId");

const DAY_MS = 24 * 60 * 60 * 1000;
const SHORT_TEXT = 255;
const LONG_TEXT = 4000;
const MAX_AGE = 40;
const MAX_TYPED = 100;
const MB = 1024 * 1024;

const LONG_TEXT_FIELDS = ["personalitySummary", "specialNotes", "medicalSummary"];
const SHORT_TEXT_FIELDS = ["fosterContact", "fosterLocation", "microchipNumber"];

// The shared caps (constants/rescuerPortal.js) with the Cats column each kind goes to.
const FILE_RULES = {
  photos: { ...PORTAL_FILE_RULES.photos, column: C.PHOTOS, field: "photos" },
  videos: { ...PORTAL_FILE_RULES.videos, column: C.VIDEOS, field: "videos" },
  medicalDocuments: { ...PORTAL_FILE_RULES.medicalDocuments, column: C.MEDICAL_DOCUMENTS, field: "medicalDocuments" },
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * MB, files: 1 } });

class PortalError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function onlyRescuers(req, res, next) {
  if (req.user?.role !== ROLES.RESCUER) return res.status(403).json({ error: "Only rescuers can use this." });

  next();
}

function onlyInDatabase(req, res, next) {
  if (isDatabaseBoard("cats") && isDatabaseBoard("users") && isDatabaseBoard("rescuers")) return next();

  res.status(409).json({ error: "The rescuer portal needs Cats, Users and Rescuers kept in the database." });
}

// The Rescuers record linked to the signed-in rescuer's login, which must
// still be Active (staff can switch a rescuer off).
async function myRescuerId(req) {
  const users = await boardFields("users");
  const { rows } = await query(`select ${ident(users.field(U.LINKED_RESCUER))} as ids from ${ident(users.table)} where monday_item_id = $1`, [Number(req.user.sub)]);
  const id = rows[0]?.ids?.[0];

  if (id === undefined || id === null) throw new PortalError("Your account isn't linked to a rescuer record. Contact IBKT.", 403);

  const rescuers = await boardFields("rescuers");
  const found = await query(`select ${ident(rescuers.field(R.STATUS))} as status from ${ident(rescuers.table)} where monday_item_id = $1`, [Number(id)]);

  if (found.rows[0]?.status !== "Active") throw new PortalError("Your rescuer record isn't active. Contact IBKT.", 403);

  return String(id);
}

// Runs a handler's work and answers: a PortalError's own status, 400 for
// bad input, a store error's status, 429 for Monday's rate limit, else 500.
function handle(res, work, what) {
  work()
    .then((result) => res.json(result))
    .catch((err) => {
      if (err instanceof PortalError) return res.status(err.status).json({ error: err.message });
      if (err instanceof InputError) return res.status(400).json({ error: err.message });
      if (err instanceof StoreError) return res.status(err.status ?? 500).json({ error: err.message });
      if (err.rateLimited) return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });

      console.error(what + ":", err);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    });
}

export async function cleanCatInput(body) {
  const input = {};

  for (const field of PORTAL_FIELDS) {
    if (body[field] !== undefined && body[field] !== "") input[field] = body[field];
  }

  if (typeof input.name !== "string") input.name = body.name;

  for (const field of [...LONG_TEXT_FIELDS, ...SHORT_TEXT_FIELDS]) {
    if (input[field] === undefined) continue;

    if (typeof input[field] !== "string") throw new InputError(`${field} must be text.`);

    const max = LONG_TEXT_FIELDS.includes(field) ? LONG_TEXT : SHORT_TEXT;

    if (input[field].length > max) throw new InputError(`${field} must be under ${max} characters.`);
  }

  if (input.age !== undefined) {
    const age = Number(input.age);

    if (!Number.isFinite(age) || age < 0 || age > MAX_AGE) throw new InputError(`Age must be a number from 0 to ${MAX_AGE}.`);

    input.age = age;
  }

  // Breed and colour: from the lists as they are. Anything else a rescuer
  // typed is kept in the notes ("Breed: ...") and the dropdown left empty, so
  // nothing a rescuer types joins the lists staff share.
  const typed = [];

  for (const [field, label, column] of [["breed", "Breed", C.BREED], ["colour", "Colour", C.COLOUR]]) {
    if (input[field] === undefined) continue;

    if (typeof input[field] !== "string") throw new InputError(`${field} must be text.`);
    if (input[field].length > MAX_TYPED) throw new InputError(`${label} must be under ${MAX_TYPED} characters.`);

    if (!(await optionLabels("cats", column)).includes(input[field])) {
      typed.push(`${label}: ${input[field].trim()}`);
      delete input[field];
    }
  }

  if (typed.length) input.specialNotes = [...typed, input.specialNotes].filter(Boolean).join("\n");

  return input;
}

async function ownCat(req, id) {
  if (!ID_PATTERN.test(String(id))) throw new PortalError("Cat not found.", 404);

  const rescuerId = await myRescuerId(req);
  const cat = await getCat(id);

  if (!cat || cat.rescuerId !== rescuerId) throw new PortalError("Cat not found.", 404);

  return cat;
}

export function registerRescuerPortalRoutes(app, { requireAnyAuth }) {
  const guard = [requireAnyAuth, onlyRescuers, onlyInDatabase];

  app.get("/api/rescuer-portal/options", ...guard, (req, res) =>
    send(res, Promise.all([optionLabels("cats", C.BREED), optionLabels("cats", C.COLOUR)]).then(([breed, colour]) => ({ breed, colour })), "rescuer portal request"),
  );

  app.get("/api/rescuer-portal/cats", ...guard, (req, res) =>
    handle(
      res,
      async () => {
        const rescuerId = await myRescuerId(req);

        return (await listCats())
          .filter((cat) => cat.rescuerId === rescuerId)
          .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            status: cat.status,
            addedAt: cat.createdAt,
            photoCount: cat.photos.length,
            videoCount: cat.videos.length,
            documentCount: cat.medicalDocuments.length,
            // Files can still be added while staff haven't picked the cat up.
            canAddFiles: cat.status === STATUS.INTAKE,
          }));
      },
      "rescuer portal request",
    ),
  );

  app.post("/api/rescuer-portal/cats", ...guard, (req, res) =>
    handle(
      res,
      async () => {
        const rescuerId = await myRescuerId(req);
        const since = Date.now() - DAY_MS;
        const recent = (await listCats()).filter((cat) => cat.rescuerId === rescuerId && new Date(cat.createdAt ?? 0).getTime() > since).length;

        if (recent >= NEW_CATS_PER_DAY) throw new PortalError(`You can add up to ${NEW_CATS_PER_DAY} cats a day. Contact IBKT if you need more.`, 429);

        const input = await cleanCatInput(req.body ?? {});
        const cat = await createCatFromInput(actorOf(req), input, { fields: PORTAL_FIELDS, rescuerId });

        return { id: cat.id, name: cat.name };
      },
      "rescuer portal request",
    ),
  );

  // Body (multipart): kind = photos | videos | medicalDocuments, file. Only
  // their own cats, only while the cat is still Intake, within the caps.
  app.post(
    "/api/rescuer-portal/cats/:id/files",
    ...guard,
    (req, res, next) =>
      upload.single("file")(req, res, (err) => {
        if (!err) return next();

        res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "That file is too large." : "The upload failed." });
      }),
    (req, res) =>
      handle(
        res,
        async () => {
          const rule = FILE_RULES[req.body?.kind];
          const file = req.file;

          if (!rule) throw new InputError("kind must be photos, videos or medicalDocuments.");
          if (!file) throw new InputError("A file is required.");

          const cat = await ownCat(req, req.params.id);

          if (cat.status !== STATUS.INTAKE) throw new PortalError("Files can't be added once IBKT has started working on this cat. Contact IBKT.", 409);

          const extension = file.originalname.split(".").pop()?.toLowerCase();

          if (!rule.extensions.includes(extension)) throw new InputError(`Allowed file types: ${rule.extensions.join(", ")}.`);
          if (!contentMatchesExtension(file.buffer, extension)) throw new InputError(notThatKindOfFile(extension));
          if (file.size > rule.maxBytes) throw new InputError(`That file is larger than ${rule.maxBytes / MB} MB.`);
          if (cat[rule.field].length >= rule.max) throw new InputError(`You can add up to ${rule.max} ${req.body.kind === "medicalDocuments" ? "documents" : req.body.kind} per cat.`);

          let assetId;

          try {
            assetId = await addFileToColumn(cat.id, rule.column, file);
          } catch (err) {
            if (err.rateLimited) throw err;
            if (err.mondayErrors) throw new PortalError("Monday couldn't accept that file. Try again.", 502);

            throw err;
          }

          clearCache([CATS.BOARD_ID]);
          await refreshFileCopy(cat.id, rule.column);

          const actor = actorOf(req);

          logActivity({
            actorId: actor.id,
            actorName: actor.name,
            boardId: CATS.BOARD_ID,
            boardName: "Cats",
            itemId: cat.id,
            itemName: cat.name,
            actionType: "Updated",
            description: `${actor.name} (rescuer) uploaded a file to ${req.body.kind} on ${cat.name}`,
            fieldChanged: req.body.kind,
            raw: { itemId: cat.id, fileName: file.originalname },
          });

          return { id: assetId };
        },
        "rescuer portal request",
      ),
  );
}
