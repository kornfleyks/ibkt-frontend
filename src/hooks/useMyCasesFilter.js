import { useState } from "react";
import useAuth from "./useAuth";
import { isAdmin, isOwnedBy } from "../utils/ownership";

const STORAGE_PREFIX = "ibkt.myCases.";

// Storage can be unavailable (private mode, blocked site data) - the toggle
// then simply isn't remembered, it still works for the visit.
function readStored(key) {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "true";
  } catch {
    return false;
  }
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, String(value));
  } catch {
    // Not remembered - see readStored.
  }
}

// Owner-based list filtering for a page (see utils/ownership.js):
// - non-Admins only ever see items they own - `filter` always narrows,
//   and there's no toggle (`canToggle` false);
// - Admins see everything, with an optional per-page "My cases" /
//   "My tasks" toggle, remembered per browser, to narrow to their own.
// `ownerField` is the item's owner id field (caseOwnerId on applications,
// ownerId on tasks).
function useMyCasesFilter(pageKey, ownerField = "caseOwnerId") {
  const { user } = useAuth();
  const [toggledOn, setToggledOn] = useState(() => readStored(pageKey));
  const canToggle = isAdmin(user);
  const enabled = canToggle ? toggledOn : true;

  function setEnabled(value) {
    setToggledOn(value);
    writeStored(pageKey, value);
  }

  function filter(items) {
    if (!enabled) {
      return items;
    }

    return items.filter((item) => isOwnedBy(item[ownerField], user));
  }

  return { enabled, setEnabled, filter, canToggle };
}

export default useMyCasesFilter;
