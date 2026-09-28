import { serverGet } from "./MondayService";

// Newest first, from the server (database or Monday, see
// server/activityLog.js); the App Settings page size caps how far back.
function withDates(entries) {
  return entries.map((entry) => ({ ...entry, occurredAt: entry.occurredAt ? new Date(entry.occurredAt) : null }));
}

export async function getAllActivity() {
  return withDates(await serverGet("/api/activity"));
}

export async function getActivityForItem(boardId, itemId) {
  const params = new URLSearchParams({ boardId: String(boardId), itemId: String(itemId) });

  return withDates(await serverGet(`/api/activity?${params}`));
}
