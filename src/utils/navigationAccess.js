import { navigationItems } from "../config/navigation";

// Same rule ProtectedRoute enforces: the role must be listed, and a few
// items (e.g. App Settings) are further restricted to specific accounts.
export function canAccessNavItem(item, user) {
  if (!item.roles.includes(user?.role)) {
    return false;
  }

  if (item.emails && !item.emails.some((email) => email.toLowerCase() === user?.email?.trim().toLowerCase())) {
    return false;
  }

  return true;
}

export function getAccessibleNavItems(user) {
  return navigationItems.filter((item) => canAccessNavItem(item, user));
}

// For features that link into a section (e.g. global search results) -
// true when the section's menu item is visible to this user.
export function canAccessPath(path, user) {
  const item = navigationItems.find((navItem) => navItem.path === path);

  return Boolean(item && canAccessNavItem(item, user));
}
