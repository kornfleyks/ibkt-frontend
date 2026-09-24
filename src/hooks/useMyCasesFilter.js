import { useState } from "react";
import useAuth from "./useAuth";

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

// A per-page "My cases" / "My tasks" toggle, remembered per browser. `filter`
// narrows a list to items the logged-in user owns when the toggle is on;
// the session user id is the same as their Users board item id, which is
// what `ownerField` holds (caseOwnerId on applications, ownerId on tasks).
function useMyCasesFilter(pageKey, ownerField = "caseOwnerId") {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(() => readStored(pageKey));

  function setEnabled(value) {
    setEnabledState(value);
    writeStored(pageKey, value);
  }

  function filter(items) {
    if (!enabled || !user) {
      return items;
    }

    return items.filter((item) => String(item[ownerField]) === String(user.id));
  }

  return { enabled, setEnabled, filter };
}

export default useMyCasesFilter;
