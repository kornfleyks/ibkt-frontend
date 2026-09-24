import { useRef, useState } from "react";
import useAuth from "./useAuth";
import { getCats } from "../services/CatsService";
import { getActiveApplications } from "../services/ActiveApplicationsService";
import { getTasks } from "../services/TasksService";
import { canAccessPath, getAccessibleNavItems } from "../utils/navigationAccess";
import { buildSearchIndex } from "../utils/globalSearch";

// Re-fetched when the search is opened again after this long, so records
// created or renamed since are picked up without a page reload.
const STALE_AFTER_MS = 60_000;

// Only boards whose section this user can open are fetched - a Rescuer
// never loads (or sees) applications, etc.
const SOURCES = [
  { key: "cats", path: "/cats", load: getCats },
  { key: "applications", path: "/active-applications", load: getActiveApplications },
  { key: "tasks", path: "/tasks", load: getTasks },
];

function useGlobalSearchIndex() {
  const { user } = useAuth();
  const [index, setIndex] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failedSources, setFailedSources] = useState([]);
  const loadedAt = useRef(0);
  const inFlight = useRef(false);

  // Call on focus. Cheap when the index is fresh.
  async function ensureLoaded() {
    if (inFlight.current || Date.now() - loadedAt.current < STALE_AFTER_MS) {
      return;
    }

    inFlight.current = true;
    setLoading(true);

    const sources = SOURCES.filter((source) => canAccessPath(source.path, user));

    // allSettled: one board failing still leaves the others searchable.
    const results = await Promise.allSettled(sources.map((source) => source.load()));

    const data = { pages: getAccessibleNavItems(user) };
    const failed = [];

    results.forEach((result, position) => {
      const source = sources[position];

      if (result.status === "fulfilled") {
        data[source.key] = result.value;
      } else {
        console.error(`Global search: failed to load ${source.key}:`, result.reason);
        failed.push(source.key);
      }
    });

    setIndex(buildSearchIndex(data));
    setFailedSources(failed);
    setLoading(false);

    // A failed source retries on the next focus instead of waiting a minute.
    loadedAt.current = failed.length > 0 ? 0 : Date.now();
    inFlight.current = false;
  }

  return { index, loading, failedSources, ensureLoaded };
}

export default useGlobalSearchIndex;
