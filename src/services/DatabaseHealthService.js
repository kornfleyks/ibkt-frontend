import { serverGet } from "./MondayService";

// Admin-only: the Supabase mirror's size, tables, today's query count and
// live-mirror status (see server/database/databaseHealth.js).
export async function getDatabaseHealth() {
  return serverGet("/api/admin/database-health");
}

// Development only: a page of one table's rows, secret columns left out
// (see server/database/tableRows.js).
export async function getDatabaseTableRows(table, { limit, offset }) {
  return serverGet(`/api/admin/database-tables/${encodeURIComponent(table)}/rows?limit=${limit}&offset=${offset}`);
}
