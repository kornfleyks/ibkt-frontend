import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { ROLES } from "../src/constants/roles.js";
import { getUserDirectory } from "./auth.js";
import { requireApplicationAccess } from "./applicationAccess.js";
import { writeApplicationUserLink } from "./caseOwner.js";
import { answer } from "./httpAnswer.js";
import { clearCache } from "./mondayCache.js";
import { logActivity, getItemSnapshot, resolveBoardName } from "./activityLog.js";
import { notifyAssignmentChange } from "./notifications.js";
import { actorOf, InputError } from "./database/boardRecords.js";

// An application's Assigned Volunteer (a link to the Users board, like Case
// Owner). Admins and the application's Case Owner may set it; only an
// Active user with the Volunteer role can be picked. The volunteer gets a
// bell notification when assigned or taken off.
//
//   GET  /api/applications/:id/volunteer-options    { users: [{ id, name, role }] }
//   POST /api/applications/:id/assigned-volunteer   { userId | null } -> { assignedVolunteer: { id, name } | null }
//
// The generic application update and the /api/monday proxy refuse this
// column, so these rules can't be skipped.

export const ASSIGNED_VOLUNTEER_COLUMN_ID = ACTIVE_APPLICATIONS.COLUMNS.ASSIGNED_VOLUNTEER;

const ACTIVE_ACCOUNT_STATUS = "Active";
const ITEM_ID_PATTERN = /^\d+$/;

// Active Volunteers, sorted by name.
export async function getVolunteerOptions() {
  return (await getUserDirectory())
    .filter((user) => user.accountStatus === ACTIVE_ACCOUNT_STATUS && user.role === ROLES.VOLUNTEER)
    .map(({ id, name, role }) => ({ id, name, role }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function assignVolunteer(req) {
  const { id: applicationId } = req.params;
  const userId = req.body?.userId ?? null;

  if (userId !== null && !ITEM_ID_PATTERN.test(String(userId))) throw new InputError("Invalid user id.");

  let volunteer = null;

  if (userId !== null) {
    volunteer = (await getVolunteerOptions()).find((user) => user.id === String(userId)) ?? null;

    if (!volunteer) throw new InputError("Only an active user with the Volunteer role can be the assigned volunteer.");
  }

  const prior = await getItemSnapshot(applicationId, ASSIGNED_VOLUNTEER_COLUMN_ID, ACTIVE_APPLICATIONS.BOARD_ID);

  await writeApplicationUserLink(ASSIGNED_VOLUNTEER_COLUMN_ID, applicationId, volunteer?.id ?? null);
  clearCache([ACTIVE_APPLICATIONS.BOARD_ID]);

  const actor = actorOf(req);
  const itemName = prior?.itemName || `item ${applicationId}`;
  const oldValue = prior?.columnText || "(empty)";
  const newValue = volunteer?.name ?? "(empty)";

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    boardName: resolveBoardName(ACTIVE_APPLICATIONS.BOARD_ID),
    itemId: applicationId,
    itemName,
    actionType: "Updated",
    description: `${actor.name} changed Assigned Volunteer from "${oldValue}" to "${newValue}" on ${itemName}`,
    fieldChanged: "Assigned Volunteer",
    oldValue,
    newValue,
    raw: { applicationId, userId: volunteer?.id ?? null },
  });

  notifyAssignmentChange({
    kind: "volunteer",
    previousIds: prior?.linkedIds ?? [],
    nextIds: volunteer ? [volunteer.id] : [],
    actor,
    target: { boardId: ACTIVE_APPLICATIONS.BOARD_ID, itemId: applicationId, name: itemName },
    link: `/active-applications/${applicationId}`,
  });

  return { assignedVolunteer: volunteer ? { id: volunteer.id, name: volunteer.name } : null };
}

export function registerAssignedVolunteerRoutes(app, { requireAuth }) {
  const allowed = requireApplicationAccess("Assigned Volunteer");

  app.get("/api/applications/:id/volunteer-options", requireAuth, allowed, (req, res) =>
    answer(res, getVolunteerOptions().then((users) => ({ users })), "assigned volunteer"),
  );

  app.post("/api/applications/:id/assigned-volunteer", requireAuth, allowed, (req, res) =>
    answer(res, assignVolunteer(req), "assigned volunteer"),
  );
}
