import { ACTIVE_APPLICATIONS } from "../src/constants/boards/activeApplications.js";
import { ROLES } from "../src/constants/roles.js";
import { getItemSnapshot } from "./activityLog.js";

// Who may use an application's thread and contract files: Admins and its
// Case Owner, the same rule as the application page (src/utils/ownership.js
// canSeeApplication). From the database copy when it's current, else one
// Monday call. An unknown application, or a failed read, answers false.
export async function canAccessApplication(user, applicationId) {
  if (user.role === ROLES.ADMIN) return true;

  const snapshot = await getItemSnapshot(applicationId, ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER, ACTIVE_APPLICATIONS.BOARD_ID);

  return (snapshot?.linkedIds ?? []).includes(String(user.sub));
}
