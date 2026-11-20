import { TESTIMONIAL_STATUS } from "../../src/constants/testimonials.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/notificationsStatuses.js";
import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { isAdminRole } from "../../src/constants/roles.js";
import { REMINDER_INTERVAL_DAYS, MAX_ATTEMPTS } from "../../src/constants/postAdoptionReminders.js";
import { listActiveAccounts } from "../accountState.js";
import { createNotification } from "../notifications.js";
import { getItemSnapshot } from "../activityLog.js";
import * as databaseStore from "./databaseStore.js";
import * as store from "./testimonialStore.js";
import { addToDate } from "./rules.js";
import { BOARD_ID } from "./fields.js";

// The daily reminders for testimonial requests (docs/testimonial-requests.md),
// run with the post-adoption reminders (reminders.js). Staff ask the adopter
// themselves; for a request that is still waiting:
//
//   REMINDER_INTERVAL_DAYS after an attempt, below MAX_ATTEMPTS attempts:
//     remind the owner to chase again (the "Chased again" button records it)
//   REMINDER_INTERVAL_DAYS after the last attempt with no answer:
//     the request becomes No response, and the owner is told
//
// The owner is the record's Post-Adoption Owner; with none, the application's
// Case Owner and the Admins. Each step is claimed in the database first
// (testimonialStore.js), so a restart, or two servers, never remind twice.

const SYSTEM_ACTOR = { id: "system", name: "IBKT System" };
const { TYPE } = NOTIFICATIONS_STATUS_OPTIONS;

const daysAfter = (date, days) => addToDate(date, { days });

// What the check should do (no side effects): [{ type, row }] with type
// "chase-reminder" or "no-response". `rows` are the Requested states.
export function planTestimonialReminders({ rows, today }) {
  const actions = [];

  for (const row of rows) {
    if (row.status !== TESTIMONIAL_STATUS.REQUESTED || !row.lastRequestedOn) continue;

    const due = daysAfter(row.lastRequestedOn, REMINDER_INTERVAL_DAYS);

    if (due > today) continue;

    if (row.attempts >= MAX_ATTEMPTS) actions.push({ type: "no-response", row });
    else if (!row.lastRemindedOn || row.lastRemindedOn < due) actions.push({ type: "chase-reminder", row });
  }

  return actions;
}

// The real helpers; the tests pass their own.
const realDeps = {
  listRows: () => store.listRequested(TESTIMONIAL_STATUS.REQUESTED),
  claims: store,
  getRecord: databaseStore.getRecord,
  caseOwnerIdOf: async (applicationId) => (await getItemSnapshot(applicationId, ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER, ACTIVE_APPLICATIONS.BOARD_ID))?.linkedIds?.[0] ?? null,
  adminIds: () => listActiveAccounts().filter((account) => isAdminRole(account.role)).map((account) => account.id),
  notify: createNotification,
};

// Answers { chases, noResponse } (how many of each were done).
export async function runTestimonialReminders({ today, deps = realDeps }) {
  const stats = { chases: 0, noResponse: 0 };

  for (const action of planTestimonialReminders({ rows: await deps.listRows(), today })) {
    const { type, row } = action;

    try {
      const claimed =
        type === "chase-reminder"
          ? await deps.claims.claimChaseReminder(row.recordId, today, { intervalDays: REMINDER_INTERVAL_DAYS, max: MAX_ATTEMPTS })
          : await deps.claims.claimNoResponse(row.recordId, today, { intervalDays: REMINDER_INTERVAL_DAYS, max: MAX_ATTEMPTS });

      if (!claimed) continue;

      const record = await deps.getRecord(row.recordId);

      if (!record) continue;

      const caseOwnerId = record.ownerId ? null : await deps.caseOwnerIdOf(record.linkedApplicationId);
      const recipients = [...new Set((record.ownerId ? [record.ownerId] : [caseOwnerId, ...deps.adminIds()]).filter(Boolean).map(String))];
      const name = record.name || "this adoption";
      const message =
        type === "chase-reminder"
          ? `No testimonial yet for ${name} after ${REMINDER_INTERVAL_DAYS} days (request ${row.attempts} of ${MAX_ATTEMPTS}). Ask the adopter again.`
          : `No testimonial for ${name} after ${MAX_ATTEMPTS} requests. Chasing has stopped and the request is marked No response.`;

      for (const recipientId of recipients) {
        await deps.notify({
          recipientId,
          type: TYPE.POST_ADOPTION_REMINDER,
          message,
          actor: SYSTEM_ACTOR,
          target: { boardId: BOARD_ID, itemId: record.id, name },
          link: `/active-applications/${record.linkedApplicationId}?tab=post-adoption`,
        });
      }

      if (type === "chase-reminder") stats.chases += 1;
      else stats.noResponse += 1;
    } catch (err) {
      console.error(`Testimonial reminders: ${type} for record ${row.recordId} failed.`, err.message);
    }
  }

  return stats;
}
