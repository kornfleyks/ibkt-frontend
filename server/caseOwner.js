import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { SETTING_KEYS } from "../src/constants/boards/appSettings.js";
import { getUserDirectory } from "./auth.js";
import { getListSetting } from "./appSettings.js";
import { clearCache } from "./mondayCache.js";
import { logActivity, getItemSnapshot, resolveBoardName } from "./activityLog.js";
import { notifyAssignmentChange } from "./notifications.js";
import { mondayHeaders } from "./mondayApiVersion.js";
import { mondayFetch } from "./mondayRateLimit.js";

const MONDAY_API_URL = process.env.MONDAY_API_URL;

const ITEM_ID_PATTERN = /^\d+$/;
const ACTIVE_ACCOUNT_STATUS = "Active";

// Exported for the /api/monday proxy guard: this column may only be written
// through the endpoint below, which is where the assignment rules live.
export const CASE_OWNER_COLUMN_ID = ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER;

async function mondayDirectRequest(query, variables = {}) {
  const response = await mondayFetch(MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

async function canAssignCaseOwner(role) {
  const assignerRoles = await getListSetting(SETTING_KEYS.CASE_OWNER_ASSIGNER_ROLES);

  return assignerRoles.includes(role);
}

// Active accounts in one of the CASE_OWNER_ROLES, sorted by name.
export async function getAssignableUsers() {
  const [users, eligibleRoles] = await Promise.all([
    getUserDirectory(),
    getListSetting(SETTING_KEYS.CASE_OWNER_ROLES),
  ]);

  return users
    .filter((user) => user.accountStatus === ACTIVE_ACCOUNT_STATUS && eligibleRoles.includes(user.role))
    .map(({ id, name, role }) => ({ id, name, role }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Raw write with no rule checks - callers (the endpoint below, the
// migration script) must have validated the user first.
export async function writeCaseOwner(applicationId, userId) {
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) {
        id
      }
    }
  `;

  await mondayDirectRequest(mutation, {
    boardId: ACTIVE_APPLICATIONS.BOARD_ID,
    itemId: applicationId,
    columnId: CASE_OWNER_COLUMN_ID,
    value: JSON.stringify({ item_ids: userId ? [Number(userId)] : [] }),
  });
}

export function registerCaseOwnerRoutes(app, { requireAuth }) {
  // Only assigners ever need the picker list, so nobody else gets it.
  app.get("/api/users/assignable", requireAuth, async (req, res) => {
    try {
      if (!(await canAssignCaseOwner(req.user.role))) {
        return res.status(403).json({ error: "You can't assign case owners." });
      }

      res.json({ users: await getAssignableUsers() });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load users." });
    }
  });

  // Body: { userId: string | null } - null clears the case owner.
  app.post("/api/applications/:id/case-owner", requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.body?.userId ?? null;

    if (!ITEM_ID_PATTERN.test(id) || (userId !== null && !ITEM_ID_PATTERN.test(String(userId)))) {
      return res.status(400).json({ error: "Invalid application or user id." });
    }

    try {
      if (!(await canAssignCaseOwner(req.user.role))) {
        return res.status(403).json({ error: "You can't assign case owners." });
      }

      let owner = null;

      if (userId !== null) {
        owner = (await getAssignableUsers()).find((user) => user.id === String(userId)) ?? null;

        if (!owner) {
          return res.status(400).json({
            error: "That user can't be a case owner (inactive account or role not allowed).",
          });
        }
      }

      const priorSnapshot = await getItemSnapshot(id, CASE_OWNER_COLUMN_ID);

      await writeCaseOwner(id, owner?.id ?? null);

      // Cached reads of applications (and boards linked to them) are stale.
      clearCache([ACTIVE_APPLICATIONS.BOARD_ID]);

      const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();
      const itemName = priorSnapshot?.itemName || `item ${id}`;
      const oldValue = priorSnapshot?.columnText || "(empty)";
      const newValue = owner?.name ?? "(empty)";

      logActivity({
        actorId: req.user.sub,
        actorName,
        boardId: ACTIVE_APPLICATIONS.BOARD_ID,
        boardName: resolveBoardName(ACTIVE_APPLICATIONS.BOARD_ID),
        itemId: id,
        itemName,
        actionType: "Updated",
        description: `${actorName} changed Case Owner from "${oldValue}" to "${newValue}" on ${itemName}`,
        fieldChanged: "Case Owner",
        oldValue,
        newValue,
        raw: { applicationId: id, userId: owner?.id ?? null },
      });

      notifyAssignmentChange({
        kind: "case",
        previousIds: priorSnapshot?.linkedIds ?? [],
        nextIds: owner ? [owner.id] : [],
        actor: { id: req.user.sub, name: actorName },
        target: { boardId: ACTIVE_APPLICATIONS.BOARD_ID, itemId: id, name: itemName },
        link: `/active-applications/${id}`,
      });

      res.json({ caseOwner: owner ? { id: owner.id, name: owner.name } : null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to set the case owner." });
    }
  });
}
