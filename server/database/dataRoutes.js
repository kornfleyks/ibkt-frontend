import { isDatabaseEnabled } from "./db.js";
import { MIRRORED_BOARDS } from "./mondaySchema.js";
import { listItems, getItem, createItem, updateItem, deleteItem, StoreError } from "./boardStore.js";

// /api/data/<board> - the database-first endpoints (Phase 1). Each board
// answers only when its switch is on: DATABASE_BOARDS in this server's
// environment, e.g. "tasks,cats" (empty = all boards still use Monday).
// It's per server, not in App Settings or the database, because local and
// Render share the same database - switching locally must not switch live.
// Admin-only until each board's own access rules move over (Phase 4).
//
//   GET    /api/data/boards          which boards are switched on
//   GET    /api/data/:board          list (?limit, ?offset)
//   GET    /api/data/:board/:id      one item
//   POST   /api/data/:board          { mondayItemId, name, fields } (mondayItemId until Phase 2.2)
//   PATCH  /api/data/:board/:id      { name?, fields }
//   DELETE /api/data/:board/:id

export function databaseBoards() {
  const known = new Set(MIRRORED_BOARDS.map((board) => board.table));

  return (process.env.DATABASE_BOARDS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => known.has(name));
}

function send(res, work) {
  work
    .then((result) => (result === undefined ? res.status(204).end() : res.json(result)))
    .catch((err) => {
      if (err instanceof StoreError) {
        return res.status(err.status).json({ error: err.message });
      }

      console.error("Data API:", err);
      res.status(500).json({ error: "Database request failed." });
    });
}

export function registerDataRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/data/boards", requireAuth, requireAdmin, (req, res) => {
    res.json({ enabled: isDatabaseEnabled(), boards: databaseBoards() });
  });

  // Every other route: the board must be switched on.
  app.use("/api/data/:board", requireAuth, requireAdmin, (req, res, next) => {
    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "The database isn't set up on this server." });
    }

    if (!databaseBoards().includes(req.params.board)) {
      return res.status(409).json({ error: `"${req.params.board}" still uses Monday (not in DATABASE_BOARDS).` });
    }

    next();
  });

  app.get("/api/data/:board", (req, res) => send(res, listItems(req.params.board, req.query)));
  app.get("/api/data/:board/:id", (req, res) => send(res, getItem(req.params.board, req.params.id)));
  app.post("/api/data/:board", (req, res) => send(res, createItem(req.params.board, req.body ?? {})));
  app.patch("/api/data/:board/:id", (req, res) => send(res, updateItem(req.params.board, req.params.id, req.body ?? {})));
  app.delete("/api/data/:board/:id", (req, res) => send(res, deleteItem(req.params.board, req.params.id)));
}
