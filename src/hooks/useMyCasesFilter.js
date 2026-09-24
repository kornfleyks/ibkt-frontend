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

// A per-page "My cases" toggle, remembered per browser. `filter` narrows a
// list of applications to the logged-in user's cases when the toggle is on;
// the session user id is the same as their Users board item id, which is
// what an application's caseOwnerId holds.
function useMyCasesFilter(pageKey) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(() => readStored(pageKey));

  function setEnabled(value) {
    setEnabledState(value);
    writeStored(pageKey, value);
  }

  function filter(applications) {
    if (!enabled || !user) {
      return applications;
    }

    return applications.filter((application) => String(application.caseOwnerId) === String(user.id));
  }

  return { enabled, setEnabled, filter };
}

export default useMyCasesFilter;
