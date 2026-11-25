import { CATS } from "../src/constants/boards/cats.js";
import { FOSTERS } from "../src/constants/boards/fosters.js";
import { FOSTERS_STATUS_OPTIONS } from "../src/constants/statuses/fostersStatuses.js";
import { CATS_STATUS_OPTIONS } from "../src/constants/statuses/catsStatuses.js";
import { UPDATE_FLAG } from "../src/constants/catUpdates.js";
import { trackStatusChange } from "./catUpdates/statusHook.js";
import { isDatabaseBoard } from "./database/switches.js";
import { StoreError } from "./database/boardStore.js";
import {
  readRecords,
  readRecord,
  createRecord,
  changeRecord,
  optionLabels,
  logChanges,
  logCreated,
  actorOf,
  send,
  exists,
  InputError,
} from "./database/boardRecords.js";
import { maskCat, maskCats, refuseSensitiveCatChanges } from "./sensitiveFields.js";
import { READY_REQUIRED_FOR, readinessProblems, problemsText } from "../src/constants/catReadiness.js";
import { evaluateAdoptionReady } from "./adoptionReadyGate.js";
import { logActivity } from "./activityLog.js";

// Cats kept in the database ("cats" in DATABASE_BOARDS; database-first plan
// 4.2). Same records as src/services/mappers/CatMapper.js makes from
// Monday, same access as before (every signed-in user). Files stay on
// Monday: uploads go through /api/upload, which refreshes the copy here.
//
//   GET  /api/cats              all cats
//   GET  /api/cats/options      { breed: [...], colour: [...] }
//   GET  /api/cats/foster-options  [{ id, name, city }] the Active fosters a cat can be given to
//   GET  /api/cats/:id
//   POST /api/cats              { name, ...fields } (1 Monday call: the item)
//   POST /api/cats/:id          { field: value, ... }
//   POST /api/cats/bonded       { catIds } - links every cat to the others

const C = CATS.COLUMNS;
const TABLE = "cats";
const ID_PATTERN = /^\d+$/;

export const CAT_FIELDS = {
  name: { column: "name", write: "name" },
  status: { column: C.STATUS, empty: "N/A", write: "status" },
  gender: { column: C.GENDER, empty: "N/A", write: "status" },
  breed: { column: C.BREED, empty: "N/A", write: "dropdown" },
  colour: { column: C.COLOUR, empty: "N/A", write: "dropdown" },
  energyLevel: { column: C.ENERGY_LEVEL, empty: "N/A", write: "status" },
  lapCat: { column: C.LAP_CAT, empty: "Unknown", write: "status" },
  childFriendly: { column: C.CHILD_FRIENDLY, empty: "Unknown", write: "status" },
  catFriendly: { column: C.CAT_FRIENDLY, empty: "Unknown", write: "status" },
  dogFriendly: { column: C.DOG_FRIENDLY, empty: "Unknown", write: "status" },
  indoorOnly: { column: C.INDOOR_ONLY, empty: "N/A", write: "status" },
  personalitySummary: { column: C.PERSONALITY_SUMMARY, write: "longText" },
  specialNotes: { column: C.SPECIAL_NOTES, write: "longText" },
  medicalSummary: { column: C.MEDICAL_SUMMARY, write: "longText" },
  vaccinated: { column: C.VACCINATED, empty: "No", write: "status" },
  sterilized: { column: C.NEUTERED, empty: "No", write: "status" },
  felvStatus: { column: C.FELV_STATUS, empty: "Not Tested Yet", write: "status" },
  fivStatus: { column: C.FIV_STATUS, empty: "Not Tested Yet", write: "status" },
  medicationRequired: { column: C.MEDICATION_REQUIRED, read: "equals", value: "Yes", write: "status", shownBy: "medicationRequiredText" },
  medicationRequiredText: { column: C.MEDICATION_REQUIRED },
  // The Cat Passport (the Passport section of the Medical tab, docs/cat-passport.md).
  // The dates answer "" when empty; "Passport marked complete" is set by hand.
  passportComplete: { column: C.PASSPORT_COMPLETE, read: "checked", write: "checkbox" },
  dateOfBirth: { column: C.DATE_OF_BIRTH, write: "date" },
  microchipImplantDate: { column: C.MICROCHIP_IMPLANT_DATE, write: "date" },
  firstTricat: { column: C.FIRST_TRICAT, write: "date" },
  boosterTricat: { column: C.BOOSTER_TRICAT, write: "date" },
  rabiesVaccination: { column: C.RABIES_VACCINATION, write: "date" },
  lastDewormed: { column: C.LAST_DEWORMED, write: "date" },
  microchipNumber: { column: C.MICROCHIP_NUMBER, empty: "N/A", write: "text" },
  adoptionReady: { column: C.ADOPTION_READY, empty: "N/A" },
  // Set only by the update check (catUpdates/), never by a request: POST
  // /api/cats/:id refuses it.
  updateRequested: { column: C.UPDATE_REQUESTED, empty: UPDATE_FLAG.NOT_DUE, write: "status" },
  age: { column: C.AGE, empty: "N/A", write: "number" },
  rescuer: { column: C.LINKED_RESCUER, read: "names", empty: "N/A" },
  rescuerId: { column: C.LINKED_RESCUER, read: "firstId", write: "links", shownBy: "rescuer", label: "Linked Rescuer" },
  // The foster looking after the cat (docs/foster-onboarding.md): one foster, set
  // by staff on the cat page. Only an Active foster can be given a cat.
  linkedFoster: { column: C.LINKED_FOSTER, read: "names" },
  linkedFosterId: { column: C.LINKED_FOSTER, read: "firstId", write: "links", shownBy: "linkedFoster", label: "Linked Foster" },
  foster: { column: C.FOSTER_CONTACT },
  fosterContact: { column: C.FOSTER_CONTACT, write: "text" },
  fosterLocation: { column: C.FOSTER_LOCATION, write: "text" },
  passportFile: { column: C.PASSPORT_FILE, read: "files" },
  medicalDocuments: { column: C.MEDICAL_DOCUMENTS, read: "files" },
  photos: { column: C.PHOTOS, read: "files" },
  videos: { column: C.VIDEOS, read: "files" },
  linkedAdopterId: { column: C.LINKED_ADOPTER_2, read: "firstId" },
  bondedWith: { column: C.BONDED_WITH, read: "names" },
  bondedWithIds: { column: C.BONDED_WITH, read: "ids", write: "links", shownBy: "bondedWith", label: "Bonded With" },
};

// Fields a new cat may be given (the Add Cat form).
export const CREATE_FIELDS = [
  "gender", "energyLevel", "lapCat", "childFriendly", "catFriendly", "dogFriendly", "indoorOnly", "vaccinated",
  "sterilized", "felvStatus", "fivStatus", "medicationRequired", "personalitySummary", "specialNotes", "medicalSummary",
  "breed", "colour", "fosterContact", "fosterLocation", "microchipNumber", "age", "rescuerId",
];

function only(body, keys) {
  return Object.fromEntries(keys.filter((key) => body[key] !== undefined && body[key] !== "").map((key) => [key, body[key]]));
}

// Creates a cat (its Monday item at once - 1 call): Intake, FeLV/FIV not tested,
// then the allowed fields of `body`. `fields` narrows what the caller may set
// (the rescuer portal gives a shorter list) and `rescuerId`, when given,
// overrides any rescuer in the body. Used by POST /api/cats and the rescuer
// portal (rescuerPortal/routes.js).
export async function createCatFromInput(actor, body, { fields = CREATE_FIELDS, rescuerId, fosterId } = {}) {
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) throw new InputError("A name is required.");

  const linkedRescuer = rescuerId ?? body.rescuerId;

  if (linkedRescuer && !(await exists("rescuers", linkedRescuer))) throw new InputError("Unknown rescuer.");

  const values = {
    status: CATS_STATUS_OPTIONS.STATUS.INTAKE,
    felvStatus: CATS_STATUS_OPTIONS.FELV_STATUS.NOT_TESTED_YET,
    fivStatus: CATS_STATUS_OPTIONS.FIV_STATUS.NOT_TESTED_YET,
    ...only(body, fields),
    ...(rescuerId ? { rescuerId } : {}),
    ...(fosterId ? { linkedFosterId: fosterId } : {}),
  };
  const record = await createRecord(TABLE, CAT_FIELDS, { name: name.slice(0, 255), values });

  logCreated({ actor, table: TABLE, boardName: "Cats", record, raw: values });

  return record;
}

// Links every cat in `ids` to all the others as one bonded group (each cat's
// Bonded With holds the rest). The caller has checked that the ids exist.
export async function linkBondedCats(actor, ids) {
  for (const id of ids) {
    await changeCat(actor, id, { bondedWithIds: ids.filter((other) => other !== id) });
  }
}

// The Active fosters, by name, for the foster picker on the cat page.
async function listFosterOptions() {
  if (!isDatabaseBoard("fosters")) throw new InputError("Fosters are not switched on on this server (add fosters to DATABASE_BOARDS).");

  const fosters = await readRecords("fosters", {
    status: { column: FOSTERS.COLUMNS.STATUS },
    city: { column: FOSTERS.COLUMNS.CITY },
  });

  return fosters
    .filter((foster) => foster.status === FOSTERS_STATUS_OPTIONS.STATUS.ACTIVE)
    .map((foster) => ({ id: foster.id, name: foster.name, city: foster.city }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// A cat can only be given to a foster that exists and is Active. Clearing the
// foster (null) is always allowed.
async function checkFoster(changes) {
  if (!Object.hasOwn(changes, "linkedFosterId") || changes.linkedFosterId === null) return;

  if (!isDatabaseBoard("fosters")) throw new InputError("Fosters are not switched on on this server (add fosters to DATABASE_BOARDS).");

  const foster = await readRecord("fosters", { status: { column: FOSTERS.COLUMNS.STATUS } }, changes.linkedFosterId);

  if (!foster) throw new InputError("Unknown foster.");
  if (foster.status !== FOSTERS_STATUS_OPTIONS.STATUS.ACTIVE) throw new InputError("Only an Active foster can be given a cat.");
}

export function listCats() {
  return readRecords(TABLE, CAT_FIELDS);
}

export function getCat(id) {
  return readRecord(TABLE, CAT_FIELDS, id);
}

// Sets a cat's Update Requested flag (the update check, catUpdates/); logged
// like any change.
export async function setUpdateFlag(actor, id, flag) {
  const result = await changeRecord(TABLE, CAT_FIELDS, id, { updateRequested: flag });

  if (!result) return null;

  logChanges({ actor, table: TABLE, boardName: "Cats", fields: CAT_FIELDS, ...result, keys: ["updateRequested"] });

  return result.after;
}

// Used by Matching (server-side) to set a cat's status; logged like any change.
// A change of status also starts or ends the cat's update clock (catUpdates/):
// a cat that becomes Adoption Ready starts a new one, a cat that leaves it
// loses its clock and its flag goes back to Not Due.
export async function changeCat(actor, id, changes) {
  const result = await changeRecord(TABLE, CAT_FIELDS, id, changes);

  if (!result) return null;

  logChanges({ actor, table: TABLE, boardName: "Cats", fields: CAT_FIELDS, ...result, keys: Object.keys(changes) });

  // The change itself is saved: a failure here must not look like one.
  await trackStatusChange({ catId: id, from: result.before.status, to: result.after.status, setFlag: (flag) => setUpdateFlag(actor, id, flag) }).catch((err) =>
    console.error(`Cat update check: couldn't update the clock of cat ${id}.`, err.message),
  );

  return result.after;
}

// The Adoption Ready check for a change that sets a cat's status to it
// (adoptionReadyGate.js). Reads the cat itself: the check needs its real values.
async function adoptionReadyGate(req, changes, overrideReason) {
  if (!READY_REQUIRED_FOR.includes(changes.status)) return null;

  return evaluateAdoptionReady({ changes, current: await getCat(req.params.id), role: req.user.role, overrideReason });
}

// The Activity Log entry for an override, saying what was missing and why it was set anyway.
function logOverride(actor, catId, catName, { problems, reason, status }) {
  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: CATS.BOARD_ID,
    boardName: "Cats",
    itemId: catId,
    itemName: catName,
    actionType: "Updated",
    description: `${actor.name} set ${catName} to ${status} although it was not ready (missing: ${problemsText(problems)}). Reason: ${reason}`,
    fieldChanged: "Status",
    raw: { override: true, missing: problems.map((problem) => problem.key) },
  });
}

export function registerCatRoutes(app, { requireAuth }) {
  const onlyInDatabase = (req, res, next) =>
    isDatabaseBoard(TABLE) ? next() : res.status(409).json({ error: "Cats are still kept on Monday on this server." });

  app.get("/api/cats", requireAuth, onlyInDatabase, (req, res) => send(res, listCats().then((cats) => maskCats(cats, req.user.role)), "cats request"));

  app.get("/api/cats/options", requireAuth, onlyInDatabase, (req, res) =>
    send(
      res,
      Promise.all([optionLabels(TABLE, C.BREED), optionLabels(TABLE, C.COLOUR)]).then(([breed, colour]) => ({ breed, colour })),
      "cats request",
    ),
  );

  app.get("/api/cats/foster-options", requireAuth, onlyInDatabase, (req, res) => send(res, listFosterOptions(), "cats request"));

  app.post("/api/cats/bonded", requireAuth, onlyInDatabase, (req, res) => {
    send(
      res,
      (async () => {
        const ids = [...new Set((req.body?.catIds ?? []).map(String))];

        if (!ids.length || !ids.every((id) => ID_PATTERN.test(id))) throw new InputError("catIds must be cat ids.");

        for (const id of ids) {
          if (!(await exists(TABLE, id))) throw new InputError(`Unknown cat ${id}.`);
        }

        await linkBondedCats(actorOf(req), ids);

        return { linked: ids.length };
      })(),
      "cats request",
    );
  });

  app.get("/api/cats/:id", requireAuth, onlyInDatabase, (req, res) =>
    send(res, getCat(req.params.id).then((cat) => maskCat(cat, req.user.role)), "cats request"),
  );

  // Any staff user may enter a microchip number when adding a cat; only an
  // Admin sees it afterwards (the answer has it hidden for the others).
  app.post("/api/cats", requireAuth, onlyInDatabase, (req, res) => {
    send(res, createCatFromInput(actorOf(req), req.body ?? {}).then((cat) => maskCat(cat, req.user.role)), "cats request");
  });

  // What a cat still needs before it can be set to Adoption Ready (the real
  // values, so a hidden microchip number counts). { ready, problems }.
  app.get("/api/cats/:id/readiness", requireAuth, onlyInDatabase, (req, res) =>
    send(
      res,
      getCat(req.params.id).then((cat) => (cat ? { ready: readinessProblems(cat).length === 0, problems: readinessProblems(cat) } : null)),
      "cats request",
    ),
  );

  app.post("/api/cats/:id", requireAuth, onlyInDatabase, async (req, res) => {
    // overrideReason is not a cat field: an Admin's reason for setting a cat
    // to Adoption Ready although it is not ready (adoptionReadyGate).
    const { overrideReason, ...changes } = req.body ?? {};
    let gate;

    try {
      refuseSensitiveCatChanges(changes, req.user.role);

      // The flag is managed by the update check and "Update received".
      if (Object.hasOwn(changes, "updateRequested")) throw new StoreError("The update flag is set automatically.", 403);

      gate = await adoptionReadyGate(req, changes, overrideReason);
    } catch (err) {
      return send(res, Promise.reject(err), "cats request");
    }

    if (gate?.refusal) return res.status(409).json(gate.refusal);

    send(
      res,
      (async () => {
        if (changes.rescuerId && !(await exists("rescuers", changes.rescuerId))) throw new InputError("Unknown rescuer.");

        await checkFoster(changes);

        const updated = await changeCat(actorOf(req), req.params.id, changes);

        if (updated && gate?.override) logOverride(actorOf(req), req.params.id, updated.name, gate.override);

        return maskCat(updated, req.user.role);
      })(),
      "cats request",
    );
  });
}
