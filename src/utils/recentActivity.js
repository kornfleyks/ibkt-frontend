import { CATS } from "../constants/boards/cats";
import { ACTIVE_APPLICATIONS } from "../constants/boards/activeApplications";
import { TASKS } from "../constants/boards/tasks";
import { USERS } from "../constants/boards/users";
import { canAccessPath } from "./navigationAccess";

// "Work" actions only - sign-ins, registrations and password resets stay
// on the Activity Log page.
export const WORK_ACTION_TYPES = ["Created", "Updated", "Commented", "Approved", "Rejected"];

// Board -> the section page that governs who may see its activity, and how
// to link an entry to its item. Boards without a page of their own
// (Travel, Post-Adoption, Rescuers, ...) are Admin-only.
const BOARD_SECTIONS = {
  [CATS.BOARD_ID]: { path: "/cats", link: (entry) => `/cats/${entry.itemId}` },
  [ACTIVE_APPLICATIONS.BOARD_ID]: {
    path: "/active-applications",
    link: (entry) => `/active-applications/${entry.itemId}`,
  },
  [TASKS.BOARD_ID]: {
    path: "/tasks",
    // No task detail page - the Tasks list, searched for it.
    link: (entry) => `/tasks?tab=all&q=${encodeURIComponent(entry.itemName)}`,
  },
  [USERS.BOARD_ID]: { path: "/users", link: () => "/users" },
};

export function canSeeActivityEntry(entry, user) {
  const section = BOARD_SECTIONS[entry.boardId];

  return section ? canAccessPath(section.path, user) : user?.role === "Admin";
}

export function getActivityEntryLink(entry) {
  const section = BOARD_SECTIONS[entry.boardId];

  return section && entry.itemId ? section.link(entry) : null;
}

// `entries` newest first (as ActivityLogService returns them).
export function selectRecentActivity(entries, user, limit) {
  return entries
    .filter((entry) => WORK_ACTION_TYPES.includes(entry.actionType) && canSeeActivityEntry(entry, user))
    .slice(0, limit);
}
