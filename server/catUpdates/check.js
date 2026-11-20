import { ADOPTION_READY_STATUS } from "../../src/constants/catReadiness.js";
import { UPDATE_FLAG, UPDATE_AFTER_MONTHS, OVERDUE_AFTER_DAYS } from "../../src/constants/catUpdates.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/notificationsStatuses.js";
import { CATS } from "../../src/constants/boards/cats.js";
import { isStaffRole } from "../../src/constants/roles.js";
import { listActiveAccounts } from "../accountState.js";
import { createNotification } from "../notifications.js";
import { isDatabaseEnabled } from "../database/db.js";
import { isDatabaseBoard } from "../database/switches.js";
import { listCats, setUpdateFlag } from "../cats.js";
import { listClocks, startClock, clearClock, claimRequested, claimOverdue } from "./clockStore.js";

// The daily update check for cats waiting for a home (docs/cat-update-check.md).
// For every Adoption Ready cat:
//   - no clock yet (it became ready before this existed): the clock starts today
//   - UPDATE_AFTER_MONTHS since it became ready, or since the last update
//     received: flag Requested, and the Admins and Volunteers are told
//   - requested and unanswered for OVERDUE_AFTER_DAYS: flag Overdue, told again
// and a clock whose cat is no longer Adoption Ready is removed. Each step
// happens once per cat (claimRequested / claimOverdue), so a restart, or two
// servers running the check, never tell anyone twice.

const SYSTEM_ACTOR = { id: "system", name: "IBKT System" };
const FIRST_CHECK_DELAY_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

const isDue = (iso, now) => Boolean(iso) && new Date(iso) <= now;

// What the check should do, from the cats and their clocks (no side effects,
// so the timing is easy to test): [{ type: "start" | "request" | "overdue" |
// "clear", cat, clock? }]. `cats` are the cat records, `clocks` the clock rows.
export function planCatUpdates({ cats, clocks, now }) {
  const actions = [];
  const clockOf = new Map(clocks.map((clock) => [String(clock.catId), clock]));
  const catOf = new Map(cats.map((cat) => [String(cat.id), cat]));

  for (const cat of cats.filter((entry) => entry.status === ADOPTION_READY_STATUS)) {
    const clock = clockOf.get(String(cat.id));

    if (!clock) {
      actions.push({ type: "start", cat });
    } else if (!clock.requestedAt && isDue(clock.dueAt, now)) {
      actions.push({ type: "request", cat, clock });
    } else if (clock.requestedAt && !clock.overdueAt && isDue(clock.overdueDueAt, now)) {
      actions.push({ type: "overdue", cat, clock });
    }
  }

  // A cat that left Adoption Ready some other way than through the app.
  for (const clock of clocks) {
    const cat = catOf.get(String(clock.catId));

    if (cat?.status !== ADOPTION_READY_STATUS) actions.push({ type: "clear", cat: cat ?? null, clock });
  }

  return actions;
}

// Everyone who works on cats: Admins, Super Admins and Volunteers.
function recipients() {
  return listActiveAccounts().filter((account) => isStaffRole(account.role));
}

async function tellStaff(cat, message) {
  for (const account of recipients()) {
    await createNotification({
      recipientId: account.id,
      type: NOTIFICATIONS_STATUS_OPTIONS.TYPE.CAT_UPDATE,
      message,
      actor: SYSTEM_ACTOR,
      target: { boardId: CATS.BOARD_ID, itemId: cat.id, name: cat.name },
      link: `/cats/${cat.id}`,
    });
  }
}

// Answers { started, requested, overdue, cleared } (how many of each).
export async function runCatUpdateCheck({ now = new Date() } = {}) {
  const stats = { started: 0, requested: 0, overdue: 0, cleared: 0 };

  if (!isDatabaseEnabled() || !isDatabaseBoard("cats")) return stats;

  const actions = planCatUpdates({ cats: await listCats(), clocks: await listClocks(), now });

  for (const { type, cat, clock } of actions) {
    if (type === "start") {
      await startClock(cat.id);
      stats.started += 1;
    } else if (type === "request") {
      if (await claimRequested(cat.id)) {
        await setUpdateFlag(SYSTEM_ACTOR, cat.id, UPDATE_FLAG.REQUESTED);
        await tellStaff(cat, `${cat.name} has been waiting for a home for ${UPDATE_AFTER_MONTHS} months. Ask the rescuer or foster for an update.`);
        stats.requested += 1;
      }
    } else if (type === "overdue") {
      if (await claimOverdue(cat.id)) {
        await setUpdateFlag(SYSTEM_ACTOR, cat.id, UPDATE_FLAG.OVERDUE);
        await tellStaff(cat, `The update for ${cat.name} is overdue: it was requested ${OVERDUE_AFTER_DAYS} days ago and nobody has recorded one.`);
        stats.overdue += 1;
      }
    } else if (type === "clear") {
      await clearClock(clock.catId);

      if (cat && cat.updateRequested !== UPDATE_FLAG.NOT_DUE) await setUpdateFlag(SYSTEM_ACTOR, cat.id, UPDATE_FLAG.NOT_DUE);

      stats.cleared += 1;
    }
  }

  return stats;
}

// Never throws: a failed check is tried again at the next one.
async function safeCheck() {
  try {
    const stats = await runCatUpdateCheck();

    console.log(`Cat update check: ${stats.started} clock(s) started, ${stats.requested} requested, ${stats.overdue} overdue, ${stats.cleared} cleared.`);
  } catch (err) {
    console.error("Cat update check failed.", err);
  }
}

// At server start (after a short delay) and then every day. A server that
// sleeps (Render's free plan) catches up at its next start.
export function startCatUpdateChecks() {
  setTimeout(safeCheck, FIRST_CHECK_DELAY_MS).unref();
  setInterval(safeCheck, CHECK_INTERVAL_MS).unref();
}
