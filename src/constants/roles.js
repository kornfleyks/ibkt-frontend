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

// The only two accounts Super Admin is ever applied to (2026-10-04). Role
// and account status are locked for these on the Users page, for every
// viewer including each other - not tied to whoever happens to be signed
// in (src/pages/Users/Users.jsx, server/users.js, server/userAdmin.js).
export const SUPER_ADMIN_EMAILS = ["billkifonidis@gmail.com", "support@ittybittykittytails.co.uk"];

export function isSuperAdminEmail(email) {
  return SUPER_ADMIN_EMAILS.includes(String(email ?? "").trim().toLowerCase());
}
