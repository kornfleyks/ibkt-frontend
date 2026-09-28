import { serverGet } from "./MondayService";

// Admin-only: the Supabase mirror's size, tables, today's query count and
// live-mirror status (see server/database/databaseHealth.js).
export async function getDatabaseHealth() {
  return serverGet("/api/admin/database-health");
}
