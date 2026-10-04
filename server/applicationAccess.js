import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { isAdminRole } from "../src/constants/roles.js";
import { getItemSnapshot } from "./activityLog.js";

// Who may use an application's thread and contract files: Admins and its
// Case Owner, the same rule as the application page (src/utils/ownership.js
// canSeeApplication). From the database copy when it's current, else one
// Monday call. An unknown application, or a failed read, answers false.
export async function canAccessApplication(user, applicationId) {
  if (isAdminRole(user.role)) return true;

  const snapshot = await getItemSnapshot(applicationId, ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER, ACTIVE_APPLICATIONS.BOARD_ID);

  return (snapshot?.linkedIds ?? []).includes(String(user.sub));
}

// Route guard for /api/applications/:id/... (and :assetId when present):
// valid ids, and the signed-in user is an Admin or the Case Owner.
export function requireApplicationAccess(what) {
  return async (req, res, next) => {
    const { id, assetId } = req.params;

    if (!/^\d+$/.test(id ?? "") || (assetId !== undefined && !/^\d+$/.test(assetId))) {
      return res.status(400).json({ error: "Invalid application or file id." });
    }

    try {
      if (!(await canAccessApplication(req.user, id))) {
        return res.status(403).json({ error: `You can't see this application's ${what}.` });
      }

      next();
    } catch (err) {
      console.error(`Application ${what}:`, err);
      res.status(500).json({ error: `The ${what} request failed.` });
    }
  };
}
