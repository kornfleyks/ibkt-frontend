import { CATS } from "../src/constants/boards/cats.js";
import { CATS_STATUS_OPTIONS } from "../src/constants/statuses/catsStatuses.js";
import { isDatabaseBoard } from "./database/switches.js";
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

// Cats kept in the database ("cats" in DATABASE_BOARDS; database-first plan
// 4.2). Same records as src/services/mappers/CatMapper.js makes from
// Monday, same access as before (every signed-in user). Files stay on
// Monday: uploads go through /api/upload, which refreshes the copy here.
//
//   GET  /api/cats              all cats
//   GET  /api/cats/options      { breed: [...], colour: [...] }
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
  felvFivStatus: { column: C.FELV_FIV_STATUS, empty: "Unknown", write: "status" },
  medicationRequired: { column: C.MEDICATION_REQUIRED, read: "equals", value: "Yes", write: "status", shownBy: "medicationRequiredText" },
  medicationRequiredText: { column: C.MEDICATION_REQUIRED },
  passportComplete: { column: C.PASSPORT_COMPLETE, read: "checked" },
  microchipNumber: { column: C.MICROCHIP_NUMBER, empty: "N/A", write: "text" },
  adoptionReady: { column: C.ADOPTION_READY, empty: "N/A" },
  age: { column: C.AGE, empty: "N/A", write: "number" },
  rescuer: { column: C.LINKED_RESCUER, read: "names", empty: "N/A" },
  rescuerId: { column: C.LINKED_RESCUER, read: "firstId", write: "links", shownBy: "rescuer", label: "Linked Rescuer" },
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
const CREATE_FIELDS = [
  "gender", "energyLevel", "lapCat", "childFriendly", "catFriendly", "dogFriendly", "indoorOnly", "vaccinated",
  "sterilized", "felvFivStatus", "medicationRequired", "personalitySummary", "specialNotes", "medicalSummary",
  "breed", "colour", "fosterContact", "fosterLocation", "microchipNumber", "age", "rescuerId",
];

function only(body, keys) {
  return Object.fromEntries(keys.filter((key) => body[key] !== undefined && body[key] !== "").map((key) => [key, body[key]]));
}

export function listCats() {
  return readRecords(TABLE, CAT_FIELDS);
}

export function getCat(id) {
  return readRecord(TABLE, CAT_FIELDS, id);
}

// Used by Matching (server-side) to set a cat's status; logged like any change.
export async function changeCat(actor, id, changes) {
  const result = await changeRecord(TABLE, CAT_FIELDS, id, changes);

  if (!result) return null;

  logChanges({ actor, table: TABLE, boardName: "Cats", fields: CAT_FIELDS, ...result, keys: Object.keys(changes) });

  return result.after;
}

export function registerCatRoutes(app, { requireAuth }) {
  const onlyInDatabase = (req, res, next) =>
    isDatabaseBoard(TABLE) ? next() : res.status(409).json({ error: "Cats are still kept on Monday on this server." });

  app.get("/api/cats", requireAuth, onlyInDatabase, (req, res) => send(res, listCats(), "cats request"));

  app.get("/api/cats/options", requireAuth, onlyInDatabase, (req, res) =>
    send(
      res,
      Promise.all([optionLabels(TABLE, C.BREED), optionLabels(TABLE, C.COLOUR)]).then(([breed, colour]) => ({ breed, colour })),
      "cats request",
    ),
  );

  app.post("/api/cats/bonded", requireAuth, onlyInDatabase, (req, res) => {
    send(
      res,
      (async () => {
        const ids = [...new Set((req.body?.catIds ?? []).map(String))];

        if (!ids.length || !ids.every((id) => ID_PATTERN.test(id))) throw new InputError("catIds must be cat ids.");

        for (const id of ids) {
          if (!(await exists(TABLE, id))) throw new InputError(`Unknown cat ${id}.`);
        }

        const actor = actorOf(req);

        for (const id of ids) {
          await changeCat(actor, id, { bondedWithIds: ids.filter((other) => other !== id) });
        }

        return { linked: ids.length };
      })(),
      "cats request",
    );
  });

  app.get("/api/cats/:id", requireAuth, onlyInDatabase, (req, res) => send(res, getCat(req.params.id), "cats request"));

  app.post("/api/cats", requireAuth, onlyInDatabase, (req, res) => {
    send(
      res,
      (async () => {
        const body = req.body ?? {};
        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!name) throw new InputError("A name is required.");

        if (body.rescuerId && !(await exists("rescuers", body.rescuerId))) throw new InputError("Unknown rescuer.");

        const values = { status: CATS_STATUS_OPTIONS.STATUS.INTAKE, ...only(body, CREATE_FIELDS) };
        const record = await createRecord(TABLE, CAT_FIELDS, { name: name.slice(0, 255), values });

        logCreated({ actor: actorOf(req), table: TABLE, boardName: "Cats", record, raw: values });

        return record;
      })(),
      "cats request",
    );
  });

  app.post("/api/cats/:id", requireAuth, onlyInDatabase, (req, res) => {
    send(
      res,
      (async () => {
        const changes = req.body ?? {};

        if (changes.rescuerId && !(await exists("rescuers", changes.rescuerId))) throw new InputError("Unknown rescuer.");

        return changeCat(actorOf(req), req.params.id, changes);
      })(),
      "cats request",
    );
  });
}
