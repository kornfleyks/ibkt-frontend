// User roles from Users.Role status column.
export const ROLES = {
  VOLUNTEER: "Volunteer",
  ADMIN: "Admin",
  // Admin-and-more: satisfies anything Admin does (isAdminRole,
  // roleSatisfies below), plus a couple of further-restricted pages gated
  // separately by email (see SUPER_ADMIN_EMAILS). Only ever set on the two
  // accounts in that list - never selectable in the Users page role picker,
  // never assignable through POST /api/admin/users/:id (server/users.js).
  SUPER_ADMIN: "Super Admin",
  RESCUER: "Rescuer",
  FOSTER: "Foster",
  ADOPTER: "Adopter",
};

// The portal of each role that has its own portal and no access to the staff
// app: the name the portal's sign-in page sends to the server ("portal" in POST
// /api/login) and the home page of the portal (2026-10-16 Rescuer, 2026-11-17
// Foster; Adopter is undecided and left as it is). The server refuses these
// roles on every route that doesn't opt in with requireAnyAuth (server/auth.js),
// so a new route is closed to them unless it says otherwise.
export const PORTALS = {
  [ROLES.RESCUER]: { name: "rescuer", home: "/rescuer", signIn: "/rescuer/login" },
  [ROLES.FOSTER]: { name: "foster", home: "/foster", signIn: "/foster/login" },
};

export const PORTAL_ONLY_ROLES = Object.keys(PORTALS);

// The names a portal's sign-in page may send: "rescuer", "foster".
export const PORTAL_NAMES = Object.values(PORTALS).map((portal) => portal.name);

export function isPortalOnlyRole(role) {
  return PORTAL_ONLY_ROLES.includes(role);
}

// { name, home, signIn } of the role's portal, or null for a staff role (or any
// role without a portal).
export function portalOfRole(role) {
  return PORTALS[role] ?? null;
}

// The roles that may use the staff app (2026-11-11). The server lets only
// these through every route that doesn't opt in with requireAnyAuth, and
// only these may sign in on the staff sign-in page (server/auth.js,
// server/index.js). Any other role - Adopter, Foster, a role added later, or
// none - is refused until it gets a portal of its own, so a new external role
// is closed by default instead of open until someone remembers to block it.
export const STAFF_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.VOLUNTEER];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

// True for Admin and Super Admin - use this instead of comparing a role to
// ROLES.ADMIN directly wherever Admin access is meant to include Super
// Admin too (which is everywhere Admin has access).
export function isAdminRole(role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

// Super Admin only - not a regular Admin. Use this for the handful of
// things even a regular Admin shouldn't see (App Settings, Client Review,
// the sidebar's dev-mode API usage counters).
export function isSuperAdminRole(role) {
  return role === ROLES.SUPER_ADMIN;
}

// True when `actualRole` is allowed by `requiredRoles` (an array of role
// names): either it's directly listed, or it's Super Admin and the list
// includes Admin (Super Admin satisfies anything Admin would, even a
// configurable role list that only names Admin).
export function roleSatisfies(requiredRoles, actualRole) {
  if (requiredRoles.includes(actualRole)) return true;

  return actualRole === ROLES.SUPER_ADMIN && requiredRoles.includes(ROLES.ADMIN);
}

// The roles that may see and change sensitive fields, such as a cat's
// microchip number (2026-11-11, docs/sensitive-fields.md). Super Admin counts
// wherever Admin is listed (roleSatisfies). To let Volunteers see them too,
// add ROLES.VOLUNTEER here. Any other role gets "Hidden" from the server.
export const SENSITIVE_FIELD_ROLES = [ROLES.ADMIN];

// What the server answers in place of a sensitive value for other roles.
export const HIDDEN_VALUE = "Hidden";

export function canSeeSensitiveFields(role) {
  return roleSatisfies(SENSITIVE_FIELD_ROLES, role);
}

// The only two accounts Super Admin is ever applied to (2026-10-04). Role
// and account status are locked for these on the Users page, for every
// viewer including each other - not tied to whoever happens to be signed
// in (src/pages/Users/Users.jsx, server/users.js, server/userAdmin.js).
export const SUPER_ADMIN_EMAILS = ["billkifonidis@gmail.com", "support@ittybittykittytails.co.uk"];

export function isSuperAdminEmail(email) {
  return SUPER_ADMIN_EMAILS.includes(String(email ?? "").trim().toLowerCase());
}

// The one account allowed to permanently delete a user (2026-10-04, Users
// page). Deliberately narrower than SUPER_ADMIN_EMAILS - the other Super
// Admin account doesn't get this.
const USER_DELETE_EMAIL = "billkifonidis@gmail.com";

export function canDeleteUsers(email) {
  return String(email ?? "").trim().toLowerCase() === USER_DELETE_EMAIL;
}
