import { CHECK_INS, CHECK_IN_STATUS } from "../../src/constants/postAdoptionCheckIns.js";
import { POST_ADOPTION_STATUS_OPTIONS } from "../../src/constants/statuses/postAdoptionStatuses.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/notificationsStatuses.js";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { isAdminRole } from "../../src/constants/roles.js";
import { REMINDER_INTERVAL_DAYS, MAX_ATTEMPTS, MAX_SEND_REMINDERS, OPEN_RECORD_STATUSES } from "../../src/constants/postAdoptionReminders.js";
import { listActiveAccounts } from "../accountState.js";
import { createNotification } from "../notifications.js";
import { getItemSnapshot } from "../activityLog.js";
import { isDatabaseEnabled } from "../database/db.js";
import { isDatabaseBoard } from "../database/switches.js";
import { logChanges } from "../database/boardRecords.js";
import * as databaseStore from "./databaseStore.js";
import * as chase from "./chaseStore.js";
import { POST_ADOPTION_FIELDS, TABLE, BOARD_ID, BOARD_NAME } from "./fields.js";
import { addToDate, withRules } from "./rules.js";
import { runTestimonialReminders } from "./testimonialReminders.js";

// The daily post-adoption reminders (docs/post-adoption-reminders.md). Staff
// contact the adopters themselves; the app reminds them, for every open
// record that is not marked Stop chasing and every one of its check-ins:
//
//   due and not sent       remind the owner (and again every REMINDER_INTERVAL_DAYS,
//                          up to MAX_SEND_REMINDERS); after the last one, tell the
//                          owner, the Case Owner and the Admins it is being missed
//   Sent, no reply for     remind the owner to chase again; each chase is an
//   REMINDER_INTERVAL_DAYS attempt (the "Chased again" button on the tab)
//   MAX_ATTEMPTS attempts  chasing stops: the check-in becomes No Response, Stop
//   and no reply           chasing is ticked, Escalation Required becomes Yes (unless
//                          Urgent), and the owner, the Case Owner and the Admins
//                          are told
//
// The owner is the record's Post-Adoption Owner; with none, the application's
// Case Owner and the Admins. Each step is claimed in the database first
// (chaseStore.js), so a restart, or two servers running the check, never
// remind twice.

const SYSTEM_ACTOR = { id: "system", name: "IBKT System" };
const FIRST_CHECK_DELAY_MS = 3 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const { NOT_DUE, SENT, NO_RESPONSE } = CHECK_IN_STATUS;
const { ESCALATION_REQUIRED } = POST_ADOPTION_STATUS_OPTIONS;
const { TYPE } = NOTIFICATIONS_STATUS_OPTIONS;

export const todayUtc = () => new Date().toISOString().slice(0, 10);

const daysAfter = (date, days) => addToDate(date, { days });

// What the check should do (no side effects, so the timing is easy to test):
// [{ type, record, checkIn, ... }] with type
//   "send-reminder"   number: which reminder this is
//   "send-escalate"   the check-in keeps being missed
//   "chase-reminder"  attempt: the attempt to make now
//   "cap"             chasing stops
// `records` are open post-adoption records, `rows` the chase rows, `today`
// "YYYY-MM-DD".
export function planReminders({ records, rows, today }) {
  const rowOf = new Map(rows.map((row) => [`${row.recordId}:${row.checkIn}`, row]));
  const actions = [];

  for (const record of records) {
    if (record.stopChasing) continue;

    for (const checkIn of CHECK_INS) {
      const status = record[checkIn.statusField] || NOT_DUE;
      const due = record[checkIn.dueField];
      const row = rowOf.get(`${record.id}:${checkIn.key}`);

      if (status === NOT_DUE && due && due <= today) {
        const reminders = row?.reminders ?? 0;
        const next = row?.lastRemindedOn ? daysAfter(row.lastRemindedOn, REMINDER_INTERVAL_DAYS) : null;

        if (reminders < MAX_SEND_REMINDERS && (!next || next <= today)) {
          actions.push({ type: "send-reminder", record, checkIn, number: reminders + 1 });
        } else if (reminders >= MAX_SEND_REMINDERS && next && next <= today && !row?.escalatedAt) {
          actions.push({ type: "send-escalate", record, checkIn });
        }
      } else if (status === SENT) {
        // Marked Sent before the reminders existed: one attempt, on the last send date.
        const attempts = row?.attempts || 1;
        const lastSent = row?.lastSentOn || record.lastCheckInSent || due;

        if (!lastSent || daysAfter(lastSent, REMINDER_INTERVAL_DAYS) > today) continue;

        if (attempts >= MAX_ATTEMPTS) {
          if (!row?.escalatedAt) actions.push({ type: "cap", record, checkIn, attempts });
        } else if (!row?.lastRemindedOn || row.lastRemindedOn < daysAfter(lastSent, REMINDER_INTERVAL_DAYS)) {
          // This attempt's reminder (due REMINDER_INTERVAL_DAYS after it) has not been sent.
          actions.push({ type: "chase-reminder", record, checkIn, attempt: attempts + 1, lastSent });
        }
      }
    }
  }

  return actions;
}

function tabLink(applicationId) {
  return `/active-applications/${applicationId}?tab=post-adoption`;
}

// The real helpers; the tests pass their own.
const realDeps = {
  listRecords: () => databaseStore.listOpenRecords(OPEN_RECORD_STATUSES),
  listRows: chase.listRows,
  chase,
  caseOwnerIdOf: async (applicationId) => (await getItemSnapshot(applicationId, ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER, ACTIVE_APPLICATIONS.BOARD_ID))?.linkedIds?.[0] ?? null,
  adminIds: () => listActiveAccounts().filter((account) => isAdminRole(account.role)).map((account) => account.id),
  notify: createNotification,
  updateRecord: databaseStore.updatePostAdoption,
};

// The chase stops: this check-in is No Response, Stop chasing is ticked,
// escalation is on. Logged like any change.
async function applyCap(record, checkIn, attempts, deps, today) {
  const line = `Stopped chasing after ${attempts} unanswered attempts at the ${checkIn.label} check-in (${today}).`;
  const changes = withRules(
    record,
    {
      [checkIn.statusField]: NO_RESPONSE,
      stopChasing: true,
      escalationRequired: record.escalationRequired === ESCALATION_REQUIRED.URGENT ? ESCALATION_REQUIRED.URGENT : ESCALATION_REQUIRED.YES,
      escalationNotes: [record.escalationNotes, line].filter(Boolean).join("\n"),
    },
    today,
  );
  const result = await deps.updateRecord(record.id, changes);

  if (result) {
    logChanges({ actor: SYSTEM_ACTOR, table: TABLE, boardName: BOARD_NAME, fields: POST_ADOPTION_FIELDS, before: result.before, after: result.after, keys: Object.keys(changes) });
  }
}

// Answers { reminders, chases, capped, missed } (how many of each were done).
export async function runPostAdoptionReminders({ today = todayUtc(), deps = realDeps } = {}) {
  const stats = { reminders: 0, chases: 0, capped: 0, missed: 0 };
  const actions = planReminders({ records: await deps.listRecords(), rows: await deps.listRows(), today });
  const owners = new Map();

  // Who is told for an application: [recipient ids], the owner alone or the
  // Case Owner and the Admins (`everyone`: the owner too, and all of them).
  async function recipients(record, everyone) {
    if (!owners.has(record.linkedApplicationId)) owners.set(record.linkedApplicationId, await deps.caseOwnerIdOf(record.linkedApplicationId));

    const caseOwnerId = owners.get(record.linkedApplicationId);
    const staff = [caseOwnerId, ...deps.adminIds()];

    return [...new Set((everyone ? [record.ownerId, ...staff] : record.ownerId ? [record.ownerId] : staff).filter(Boolean).map(String))];
  }

  async function tell(record, ids, type, message) {
    for (const recipientId of ids) {
      await deps.notify({
        recipientId,
        type,
        message,
        actor: SYSTEM_ACTOR,
        target: { boardId: BOARD_ID, itemId: record.id, name: record.name || "a post-adoption" },
        link: tabLink(record.linkedApplicationId),
      });
    }
  }

  // What was done for each record in this run, so a record gets one
  // notification of each kind, not one per check-in (an old adoption can have
  // several check-ins past due at once).
  const done = new Map();
  const bucketOf = (record) => {
    if (!done.has(record.id)) done.set(record.id, { record, due: [], chase: [], missed: [], capped: [] });

    return done.get(record.id);
  };

  for (const action of actions) {
    const { type, record, checkIn } = action;

    try {
      if (type === "send-reminder") {
        if (!(await deps.chase.claimSendReminder(record.id, checkIn.key, today, { intervalDays: REMINDER_INTERVAL_DAYS, max: MAX_SEND_REMINDERS }))) continue;

        bucketOf(record).due.push(checkIn.label);
        stats.reminders += 1;
      } else if (type === "send-escalate") {
        if (!(await deps.chase.claimEscalation(record.id, checkIn.key))) continue;

        bucketOf(record).missed.push(checkIn.label);
        stats.missed += 1;
      } else if (type === "chase-reminder") {
        if (!(await deps.chase.claimChaseReminder(record.id, checkIn.key, today, action.lastSent, { intervalDays: REMINDER_INTERVAL_DAYS }))) continue;

        bucketOf(record).chase.push({ label: checkIn.label, attempt: action.attempt });
        stats.chases += 1;
      } else if (type === "cap") {
        if (!(await deps.chase.claimEscalation(record.id, checkIn.key))) continue;

        try {
          await applyCap(record, checkIn, action.attempts, deps, today);
        } catch (err) {
          await deps.chase.releaseEscalation(record.id, checkIn.key);
          throw err;
        }

        bucketOf(record).capped.push({ label: checkIn.label, attempts: action.attempts });
        stats.capped += 1;
      }
    } catch (err) {
      console.error(`Post-adoption reminders: ${type} for record ${record.id} (${checkIn.key}) failed.`, err.message);
    }
  }

  const list = (items) => items.join(", ");
  const plural = (items, one, many) => (items.length === 1 ? one : many);

  for (const { record, due, chase: chases, missed, capped } of done.values()) {
    const name = record.name || "this adoption";

    try {
      if (due.length) {
        await tell(record, await recipients(record, false), TYPE.POST_ADOPTION_REMINDER, `The ${list(due)} ${plural(due, "check-in is", "check-ins are")} due for ${name}. Contact the adopter, then mark ${plural(due, "it", "them")} Sent.`);
      }

      if (chases.length) {
        const text = list(chases.map((item) => `${item.label} (attempt ${item.attempt} of ${MAX_ATTEMPTS})`));

        await tell(record, await recipients(record, false), TYPE.POST_ADOPTION_REMINDER, `No reply for ${REMINDER_INTERVAL_DAYS} days to the ${text} ${plural(chases, "check-in", "check-ins")} for ${name}. Chase again.`);
      }

      if (missed.length) {
        await tell(record, await recipients(record, true), TYPE.ESCALATION, `The ${list(missed)} ${plural(missed, "check-in", "check-ins")} for ${name} ${plural(missed, "is", "are")} still not sent after ${MAX_SEND_REMINDERS} reminders.`);
      }

      if (capped.length) {
        const text = list(capped.map((item) => `${item.label} (${item.attempts} attempts)`));

        await tell(record, await recipients(record, true), TYPE.ESCALATION, `No reply to the ${text} ${plural(capped, "check-in", "check-ins")} for ${name}. Chasing has stopped and the adoption is escalated.`);
      }
    } catch (err) {
      console.error(`Post-adoption reminders: telling the staff about record ${record.id} failed.`, err.message);
    }
  }

  return stats;
}

// Never throws: a failed check is tried again at the next one.
async function safeCheck() {
  if (!isDatabaseEnabled() || !isDatabaseBoard(TABLE)) return;

  try {
    const stats = await runPostAdoptionReminders();

    console.log(`Post-adoption reminders: ${stats.reminders} due, ${stats.chases} chase, ${stats.capped} stopped, ${stats.missed} missed.`);
  } catch (err) {
    console.error("Post-adoption reminders failed.", err);
  }

  try {
    const stats = await runTestimonialReminders({ today: todayUtc() });

    console.log(`Testimonial reminders: ${stats.chases} chase, ${stats.noResponse} no response.`);
  } catch (err) {
    console.error("Testimonial reminders failed.", err);
  }
}

// At server start (after a short delay) and then every day. A server that
// sleeps (Render's free plan) catches up at its next start.
export function startPostAdoptionReminders() {
  setTimeout(safeCheck, FIRST_CHECK_DELAY_MS).unref();
  setInterval(safeCheck, CHECK_INTERVAL_MS).unref();
}
