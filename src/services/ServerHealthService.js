import { serverGet } from "./MondayService";

// Admin-only server details (no Monday call): { ok, startedAt,
// uptimeSeconds, lastPingAt, pingsSinceStart, memoryMb }, plus how long
// the round trip took - a long one means the server was asleep and this
// request woke it.
export async function getServerHealth() {
  const started = performance.now();
  const health = await serverGet("/api/admin/server-health");

  return { ...health, responseMs: Math.round(performance.now() - started) };
}
