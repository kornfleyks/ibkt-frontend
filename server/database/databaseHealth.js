import { isDatabaseEnabled, query, getQueryCount } from "./db.js";
import { getMirrorStatus } from "./mirror.js";
import { isDevelopmentServer } from "./tableRows.js";

// GET /api/admin/database-health (Admin): what the database mirror costs -
// size against Supabase's free 500 MB, rows and space per table, queries
// this server sent today, and how the live mirror is doing. Never calls
// Monday.

// Supabase free plan database size.
const FREE_DATABASE_BYTES = 500 * 1024 * 1024;

export function registerDatabaseHealthRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/admin/database-health", requireAuth, requireAdmin, async (req, res) => {
    if (!isDatabaseEnabled()) {
      return res.json({ enabled: false });
    }

    try {
      const started = Date.now();
      const [size, tables] = await Promise.all([
        query("select pg_database_size(current_database())::bigint as bytes"),
        query(`select relname as name, n_live_tup::bigint as rows, pg_total_relation_size(relid)::bigint as bytes
               from pg_stat_user_tables where schemaname = 'public' order by bytes desc`),
      ]);

      res.json({
        enabled: true,
        connected: true,
        responseMs: Date.now() - started,
        databaseBytes: Number(size.rows[0].bytes),
        limitBytes: FREE_DATABASE_BYTES,
        tables: tables.rows.map((row) => ({ name: row.name, rows: Number(row.rows), bytes: Number(row.bytes) })),
        queriesToday: getQueryCount(),
        mirror: getMirrorStatus(),
        // Whether this server shows table rows (tableRows.js, development only).
        canBrowseRows: isDevelopmentServer(),
      });
    } catch (err) {
      res.json({ enabled: true, connected: false, error: err.message, queriesToday: getQueryCount(), mirror: getMirrorStatus() });
    }
  });
}
