import { isDatabaseEnabled } from "./db.js";
import { runSync, getSyncStatus } from "./sync.js";
import { getSyncFailures } from "./syncFailures.js";

// Admin: the nightly Monday sync's status (Sync card on App Settings) and
// "Run now".
//   GET  /api/admin/sync      last run, waiting / failed changes, next run
//   GET  /api/admin/sync/failures  every failed change, explained
//   POST /api/admin/sync/run  run it now (one at a time)
export function registerSyncRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/admin/sync", requireAuth, requireAdmin, async (req, res) => {
    if (!isDatabaseEnabled()) {
      return res.json({ enabled: false });
    }

    try {
      res.json({ enabled: true, ...(await getSyncStatus()) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/sync/failures", requireAuth, requireAdmin, async (req, res) => {
    if (!isDatabaseEnabled()) {
      return res.json({ failures: [] });
    }

    try {
      res.json({ failures: await getSyncFailures() });
    } catch (err) {
      console.error("Sync failures:", err);
      res.status(500).json({ error: "Failed to load the failed changes." });
    }
  });

  app.post("/api/admin/sync/run", requireAuth, requireAdmin, async (req, res) => {
    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "The database isn't set up on this server." });
    }

    try {
      res.json(await runSync("manual"));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}
