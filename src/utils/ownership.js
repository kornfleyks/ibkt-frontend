import { ROLES } from "../constants/roles";

// Visibility rule for owned records: Admins see everything, everyone else
// only what is assigned to them. The session user id is their Users board
// item id, which is what these owner relations hold.
//
// This is a presentation rule - the data is still readable through the
// generic Monday proxy (see memory: users-board-read-hole).

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

export function isOwnedBy(ownerId, user) {
  return Boolean(ownerId) && String(ownerId) === String(user?.id);
}

// Applications / adoptions: owned via Case Owner.
export function canSeeApplication(application, user) {
  return isAdmin(user) || isOwnedBy(application.caseOwnerId, user);
}

// Tasks: owned via Owner.
export function canSeeTask(task, user) {
  return isAdmin(user) || isOwnedBy(task.ownerId, user);
}
