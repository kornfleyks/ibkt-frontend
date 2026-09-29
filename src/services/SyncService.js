import { serverGet, serverPost } from "./MondayService";

// Admin-only: the nightly database -> Monday sync (see server/database/sync.js).
export async function getSyncStatus() {
  return serverGet("/api/admin/sync");
}

// Runs the sync now; resolves with { status, sent, failed, mondayCalls, note }.
export async function runSyncNow() {
  return serverPost("/api/admin/sync/run", {});
}

// Every change the sync gave up on, explained (board, item, fields and
// readable values, tries, Monday's error).
export async function getSyncFailures() {
  const { failures } = await serverGet("/api/admin/sync/failures");

  return failures;
}
