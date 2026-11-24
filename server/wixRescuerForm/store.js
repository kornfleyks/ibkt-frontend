import crypto from "node:crypto";
import { query } from "../database/db.js";

// The wix_rescuer_submissions table (scripts/databaseSchema.js): what the
// Wix rescuer form sends when someone submits it (wixRescuerForm/routes.js).
// The payload is kept exactly as received, because Wix's own documentation
// does not give the shape of a form trigger's body; the fields are mapped
// once real submissions show what arrives. App-only: never sent to Monday.

// A stable key for one delivery: the same body received twice (Wix can
// repeat a request) is stored once.
function keyOf(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

// Looks anywhere in the payload for a value under a key that contains
// "email" and looks like an address. Only for showing who it was from; the
// payload itself stays the record.
export function findEmail(payload) {
  const stack = [payload];

  while (stack.length > 0) {
    const value = stack.pop();

    if (value && typeof value === "object") {
      for (const [key, inner] of Object.entries(value)) {
        if (typeof inner === "string" && /email/i.test(key) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inner.trim())) return inner.trim().slice(0, 320);

        stack.push(inner);
      }
    }
  }

  return null;
}

// Saves a submission. Resolves to { id } of the new row, or null when this
// exact body was already stored.
export async function insertSubmission(payload) {
  const { rows } = await query(
    `insert into wix_rescuer_submissions (delivery_key, email, payload) values ($1, $2, $3) on conflict (delivery_key) do nothing returning id`,
    [keyOf(payload), findEmail(payload), JSON.stringify(payload)],
  );

  return rows[0] ? { id: String(rows[0].id) } : null;
}

// Newest first, for an Admin to see what Wix is sending.
export async function listSubmissions(limit = 50) {
  const { rows } = await query("select id, email, payload, received_at from wix_rescuer_submissions order by received_at desc limit $1", [limit]);

  return rows.map((row) => ({ id: String(row.id), email: row.email, payload: row.payload, receivedAt: row.received_at }));
}
