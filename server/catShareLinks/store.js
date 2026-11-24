import crypto from "node:crypto";
import { query } from "../database/db.js";

// The cat_share_links table (scripts/databaseSchema.js): single-use links
// that let someone without an account fill in the Add Cat form. Only a hash
// of each link's code is stored, so a database copy cannot be used to open
// the form. App-only: never sent to Monday.

export const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// A link emailed from an invitation expires sooner: after that the
// invitation is sent again.
export const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
// After the cat is created the same link may upload that cat's files, but
// only for a short time.
export const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function toLink(row) {
  return {
    id: String(row.id),
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    rescuerId: row.rescuer_id ? String(row.rescuer_id) : null,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    catId: row.cat_id ? String(row.cat_id) : null,
    audience: row.audience,
    inviteeEmail: row.invitee_email,
    inviteeName: row.invitee_name,
  };
}

// How many links this person made since `sinceMs` ago.
export async function countRecentLinks(createdById, sinceMs) {
  const { rows } = await query("select count(*)::int as n from cat_share_links where created_by_id = $1 and created_at > $2", [
    String(createdById),
    new Date(Date.now() - sinceMs),
  ]);

  return rows[0].n;
}

// Makes a link and resolves to { id, code, expiresAt }. The code only exists
// here and in the reply: it is not stored. An invitation also keeps who it
// was sent to (inviteeName, inviteeEmail) and expires sooner (ttlMs).
export async function createLink({ createdById, createdByName, rescuerId, audience, ttlMs = LINK_TTL_MS, inviteeName = null, inviteeEmail = null }) {
  const code = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMs);

  const { rows } = await query(
    `insert into cat_share_links (token_hash, created_by_id, created_by_name, rescuer_id, expires_at, audience, invitee_name, invitee_email)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [hashCode(code), String(createdById), createdByName, rescuerId ? Number(rescuerId) : null, expiresAt, audience, inviteeName, inviteeEmail],
  );

  return { id: String(rows[0].id), code, expiresAt };
}

// The link when it can still be used to fill in the form (not used, not
// expired), else null.
export async function findOpenLink(code) {
  const { rows } = await query("select * from cat_share_links where token_hash = $1 and used_at is null and expires_at > now()", [hashCode(code)]);

  return rows[0] ? toLink(rows[0]) : null;
}

// Takes the link for one submission: resolves to the link for the single
// caller that finds it open, null for everyone else (so two simultaneous
// submissions cannot both create a cat).
export async function claimLink(code) {
  const { rows } = await query(
    "update cat_share_links set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning *",
    [hashCode(code)],
  );

  return rows[0] ? toLink(rows[0]) : null;
}

// Gives the link back when the cat could not be created, so the person can
// try again.
export async function releaseLink(id) {
  await query("update cat_share_links set used_at = null where id = $1 and cat_id is null", [Number(id)]);
}

export async function saveCat(id, catId) {
  await query("update cat_share_links set cat_id = $2 where id = $1", [Number(id), Number(catId)]);
}

// The link when it has made a cat and is still inside the upload window,
// else null.
export async function findLinkForUploads(code) {
  const { rows } = await query("select * from cat_share_links where token_hash = $1 and cat_id is not null and used_at > $2", [
    hashCode(code),
    new Date(Date.now() - UPLOAD_WINDOW_MS),
  ]);

  return rows[0] ? toLink(rows[0]) : null;
}
