import { ADOPTION_READY_STATUS } from "../../src/constants/catReadiness.js";
import { UPDATE_FLAG, UPDATE_AFTER_MONTHS, OVERDUE_AFTER_DAYS, UPDATE_NOTE_MAX_LENGTH } from "../../src/constants/catUpdates.js";
import { CATS } from "../../src/constants/boards/cats.js";
import { isDatabaseBoard } from "../database/switches.js";
import { actorOf, send, InputError } from "../database/boardRecords.js";
import { logActivity } from "../activityLog.js";
import { getCat, setUpdateFlag } from "../cats.js";
import { getClock, recordReceived } from "./clockStore.js";

// The update check on a cat (docs/cat-update-check.md). Staff only (every
// signed-in staff user: Admins and Volunteers).
//
//   GET  /api/cats/:id/update-clock     { applies, flag, readySince, dueAt, requestedAt, overdueAt, lastReceived, ... }
//   POST /api/cats/:id/update-received  { note? } - news arrived: the clock restarts, the flag becomes Received

// What the cat page shows. `applies` is false for a cat that is not waiting for a home.
function clockState(cat, clock) {
  const applies = cat.status === ADOPTION_READY_STATUS;

  return {
    applies,
    flag: cat.updateRequested,
    afterMonths: UPDATE_AFTER_MONTHS,
    overdueAfterDays: OVERDUE_AFTER_DAYS,
    readySince: applies ? (clock?.readySince ?? null) : null,
    dueAt: applies ? (clock?.dueAt ?? null) : null,
    requestedAt: applies ? (clock?.requestedAt ?? null) : null,
    overdueAt: applies ? (clock?.overdueAt ?? null) : null,
    lastReceived: applies && clock?.lastReceivedAt ? { at: clock.lastReceivedAt, note: clock.lastReceivedNote, by: clock.lastReceivedBy } : null,
  };
}

export function registerCatUpdateRoutes(app, { requireAuth }) {
  const onlyInDatabase = (req, res, next) =>
    isDatabaseBoard("cats") ? next() : res.status(409).json({ error: "Cats are still kept on Monday on this server." });

  app.get("/api/cats/:id/update-clock", requireAuth, onlyInDatabase, (req, res) =>
    send(
      res,
      (async () => {
        const cat = await getCat(req.params.id);

        return cat ? clockState(cat, await getClock(cat.id)) : null;
      })(),
      "cats request",
    ),
  );

  app.post("/api/cats/:id/update-received", requireAuth, onlyInDatabase, (req, res) =>
    send(
      res,
      (async () => {
        const cat = await getCat(req.params.id);

        if (!cat) return null;

        if (cat.status !== ADOPTION_READY_STATUS) throw new InputError("Updates are tracked only for cats that are Adoption Ready.");

        const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

        if (note.length > UPDATE_NOTE_MAX_LENGTH) throw new InputError(`The note can be at most ${UPDATE_NOTE_MAX_LENGTH} characters.`);

        const actor = actorOf(req);
        const clock = await recordReceived(cat.id, { note, by: actor.name });

        await setUpdateFlag(actor, cat.id, UPDATE_FLAG.RECEIVED);

        logActivity({
          actorId: actor.id,
          actorName: actor.name,
          boardId: CATS.BOARD_ID,
          boardName: "Cats",
          itemId: cat.id,
          itemName: cat.name,
          actionType: "Updated",
          description: `${actor.name} recorded an update for ${cat.name}${note ? `: ${note}` : ""}`,
          fieldChanged: "Update Requested",
        });

        return clockState({ ...cat, updateRequested: UPDATE_FLAG.RECEIVED }, clock);
      })(),
      "cats request",
    ),
  );
}
