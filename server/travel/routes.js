import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { requireApplicationAccess, canAccessApplication } from "../applicationAccess.js";
import { isDatabaseBoard } from "../database/switches.js";
import { getCat } from "../cats.js";
import { answer, HttpError } from "../httpAnswer.js";
import { getItemSnapshot, getItemName } from "../activityLog.js";
import { actorOf, logChanges, logCreated, InputError } from "../database/boardRecords.js";
import { TRAVEL_FIELDS, TABLE, BOARD_NAME, isWritable } from "./fields.js";
import { withRules, initialValues } from "./rules.js";
import { travelStore } from "./store.js";

// An application's travel record (the Travel tab), in either storage
// (store.js) with the same rules (rules.js). Admins and the application's
// Case Owner only.
//
//   GET  /api/applications/:id/travel             { record | null }
//   POST /api/applications/:id/travel             start: { travelDate? } -> { record }
//   POST /api/applications/:id/travel/:recordId   changes (writable fields) -> { record }
//   GET  /api/cats/:id/travel                     { record | null, application: { id, name } | null }
//   POST /api/cats/:id/travel/:recordId           changes, as above -> { record }
//
// Starting a record links it to the application and to the application's cat.
// The cat routes (the Travel tab of the cat page) show and change the record of
// the application the cat is matched to, under the same access rule: Admins and
// that application's Case Owner. A cat with no application has no record, and a
// record is only started from the application.

const A = ACTIVE_APPLICATIONS.COLUMNS;
const ID_PATTERN = /^\d+$/;

// The application's record, or a 404 when `recordId` isn't it.
async function recordOf(applicationId, recordId) {
  if (!ID_PATTERN.test(recordId ?? "")) throw new InputError("Invalid travel id.");

  const record = await travelStore().getRecord(recordId);

  if (!record || record.linkedApplicationId !== String(applicationId)) {
    throw new HttpError(404, "That travel record isn't on this application.");
  }

  return record;
}

async function getTravel(applicationId) {
  return { record: await travelStore().findByApplication(applicationId) };
}

async function startTravel(req) {
  const applicationId = req.params.id;
  const { travelDate } = req.body ?? {};
  const store = travelStore();

  if (await store.findByApplication(applicationId)) {
    throw new HttpError(409, "This application already has a travel record.");
  }

  const catSnapshot = await getItemSnapshot(applicationId, A.LINKED_CAT, ACTIVE_APPLICATIONS.BOARD_ID);
  const applicationName = (await getItemName(applicationId)) || `Application ${applicationId}`;
  const values = initialValues({ travelDate });
  const record = await store.createTravel({
    name: `${applicationName} - Travel`,
    values: withRules({}, values),
    applicationId,
    catId: catSnapshot?.linkedIds?.[0] ?? null,
  });

  logCreated({ actor: actorOf(req), table: TABLE, boardName: BOARD_NAME, record, raw: { applicationId, travelDate: travelDate || null } });

  return { record };
}

async function changeTravel(req) {
  return applyChange({ applicationId: req.params.id, recordId: req.params.recordId, requested: req.body ?? {}, req });
}

async function applyChange({ applicationId, recordId, requested, req }) {
  const keys = Object.keys(requested);

  if (!keys.length) throw new InputError("Nothing to change.");

  for (const key of keys) {
    if (!isWritable(key)) throw new InputError(`"${key}" can't be changed.`);
  }

  const before = await recordOf(applicationId, recordId);
  const changes = withRules(before, requested);
  const { after } = await travelStore().updateTravel(recordId, changes);

  logChanges({ actor: actorOf(req), table: TABLE, boardName: BOARD_NAME, fields: TRAVEL_FIELDS, before, after, keys: Object.keys(changes) });

  return { record: after };
}

// The application a cat is matched to, once the signed-in user may see its
// travel details (the same rule as the application): its id, or null when the
// cat has none.
async function applicationOfCat(req) {
  if (!ID_PATTERN.test(req.params.id ?? "")) throw new InputError("Invalid cat id.");
  if (!isDatabaseBoard("cats")) throw new HttpError(409, "Cats are still kept on Monday on this server.");

  const cat = await getCat(req.params.id);

  if (!cat) throw new HttpError(404, "Cat not found.");

  const applicationId = cat.linkedAdopterId;

  if (!applicationId) return null;

  if (!(await canAccessApplication(req.user, applicationId))) {
    throw new HttpError(403, "The travel details are only visible to Admins and the application's Case Owner.");
  }

  return String(applicationId);
}

async function getCatTravel(req) {
  const applicationId = await applicationOfCat(req);

  if (!applicationId) return { record: null, application: null };

  const { record } = await getTravel(applicationId);

  return { record, application: { id: applicationId, name: (await getItemName(applicationId)) || `Application ${applicationId}` } };
}

async function changeCatTravel(req) {
  const applicationId = await applicationOfCat(req);

  if (!applicationId) throw new HttpError(404, "This cat is not matched to an application, so it has no travel record.");

  return applyChange({ applicationId, recordId: req.params.recordId, requested: req.body ?? {}, req });
}

export function registerTravelRoutes(app, { requireAuth }) {
  const allowed = requireApplicationAccess("travel");
  const base = "/api/applications/:id/travel";

  app.get(base, requireAuth, allowed, (req, res) => answer(res, getTravel(req.params.id), "travel"));

  app.post(base, requireAuth, allowed, (req, res) => answer(res, startTravel(req), "travel"));

  app.post(`${base}/:recordId`, requireAuth, allowed, (req, res) => answer(res, changeTravel(req), "travel"));

  app.get("/api/cats/:id/travel", requireAuth, (req, res) => answer(res, getCatTravel(req), "travel"));

  app.post("/api/cats/:id/travel/:recordId", requireAuth, (req, res) => answer(res, changeCatTravel(req), "travel"));
}
