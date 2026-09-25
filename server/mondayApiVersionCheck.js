import { APP_SETTINGS } from "../src/constants/boards/appSettings.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../src/constants/statuses/notificationsStatuses.js";
import { mondayDirectRequest } from "./mondayClient.js";
import { getMondayApiVersion } from "./mondayApiVersion.js";
import { loadAppSettings } from "./appSettings.js";
import { listActiveAccounts } from "./accountState.js";
import { createNotification, getNotifiedRecipientIds } from "./notifications.js";

// Watches the pinned Monday API version (see mondayApiVersion.js) against
// Monday's own version list, so admins know when it's time to move to a
// newer one. Monday ships a version each quarter; a version is "current"
// for ~3 months, then "maintenance" for ~3, then deprecated (requests to it
// are silently served another version).
//
// One Monday call per check: at startup and then daily. When the pinned
// version needs action, every Active Admin gets one bell notification per
// (version, status) - dedupe is read back from the Notifications board, so
// restarts (e.g. Render waking up) don't resend it.

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 30_000;
const SYSTEM_ACTOR = { id: "system", name: "IBKT System" };

// Monday's version kinds (the Version.kind enum), grouped by what they mean
// for a pinned version.
const CURRENT_KINDS = ["current"];
const UPDATE_DUE_KINDS = ["maintenance", "previous_version"];
const PREVIEW_KINDS = ["release_candidate", "dev"];

let lastCheck = { versions: null, checkedAt: null, error: null };

// Pure: what the pinned version's position means. Statuses:
//   up_to_date  - pinned is Monday's current version;
//   update_due  - pinned is in maintenance, a newer version is current;
//   deprecated  - pinned is deprecated or no longer listed (urgent);
//   preview     - pinned is a release candidate (newer than current);
//   unknown     - Monday's list hasn't been fetched yet.
export function evaluateVersionStatus(pinned, versions) {
  if (!versions) {
    return { pinned, current: null, pinnedKind: null, status: "unknown" };
  }

  const current = versions.find((version) => CURRENT_KINDS.includes(version.kind))?.value ?? null;
  const pinnedKind = versions.find((version) => version.value === pinned)?.kind ?? null;

  let status = "deprecated";

  if (CURRENT_KINDS.includes(pinnedKind)) {
    status = "up_to_date";
  } else if (UPDATE_DUE_KINDS.includes(pinnedKind)) {
    status = "update_due";
  } else if (PREVIEW_KINDS.includes(pinnedKind)) {
    status = "preview";
  }

  return { pinned, current, pinnedKind, status };
}

const ALERT_TEXT = {
  update_due: ({ pinned, current }) =>
    `Monday API ${pinned} is now in maintenance. Update the Monday API Version setting to ${current} after checking Monday's release notes.`,
  deprecated: ({ pinned, current }) =>
    `Urgent: Monday API ${pinned} is deprecated. Update the Monday API Version setting to ${current} now.`,
};

async function alertAdmins(evaluation) {
  const text = ALERT_TEXT[evaluation.status];

  if (!text || !evaluation.current) {
    return;
  }

  const alertKey = `monday-api:${evaluation.pinned}:${evaluation.status}`;
  const alreadyNotified = await getNotifiedRecipientIds(alertKey);
  const admins = listActiveAccounts().filter((account) => account.role === "Admin" && !alreadyNotified.has(account.id));

  for (const admin of admins) {
    await createNotification({
      recipientId: admin.id,
      type: NOTIFICATIONS_STATUS_OPTIONS.TYPE.API_VERSION,
      message: text(evaluation),
      actor: SYSTEM_ACTOR,
      target: { boardId: APP_SETTINGS.BOARD_ID, itemId: alertKey, name: "Monday API version" },
      link: "/settings",
    });
  }
}

// Never throws - a failed check just keeps the last known result.
export async function checkMondayApiVersion() {
  try {
    await loadAppSettings();

    const data = await mondayDirectRequest(`query { versions { kind value } }`);

    lastCheck = { versions: data.versions ?? [], checkedAt: new Date().toISOString(), error: null };

    const evaluation = evaluateVersionStatus(getMondayApiVersion(), lastCheck.versions);

    console.log(`Monday API version check: pinned ${evaluation.pinned} is ${evaluation.status} (current ${evaluation.current}).`);
    await alertAdmins(evaluation);
  } catch (err) {
    console.error("Monday API version check failed.", err.message);
    lastCheck = { ...lastCheck, error: err.message };
  }
}

export function startMondayApiVersionChecks() {
  setTimeout(checkMondayApiVersion, FIRST_CHECK_DELAY_MS).unref();
  setInterval(checkMondayApiVersion, CHECK_INTERVAL_MS).unref();
}

export function registerMondayApiVersionRoutes(app, { requireAuth, requireAdmin }) {
  // Admin-only: for the Dashboard banner and the App Settings status line.
  // No Monday call of its own beyond the (cached) settings read, so a
  // version change saved on App Settings shows here straight away.
  app.get("/api/admin/monday-api-version", requireAuth, requireAdmin, async (req, res) => {
    await loadAppSettings();

    res.json({
      ...evaluateVersionStatus(getMondayApiVersion(), lastCheck.versions),
      checkedAt: lastCheck.checkedAt,
      checkError: lastCheck.error,
    });
  });
}
