import crypto from "node:crypto";

// One-time password reset codes. The code itself only ever travels in the
// reset email; the Users board keeps "<sha256 of code>.<expiry epoch ms>"
// in its Password Reset Token column. Keeping the expiry next to the hash
// means checks never parse the date column's text (whose format and
// timezone differ between Monday and the database).

export const RESET_CODE_TTL_MINUTES = 15;

const SEPARATOR = ".";

function hashOf(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function parseStored(stored) {
  const [hash, expiresAt] = String(stored ?? "").split(SEPARATOR);
  const expiry = Number(expiresAt);

  return hash && Number.isFinite(expiry) ? { hash, expiresAt: expiry } : null;
}

// { code, stored, expiresAt } - `code` goes in the email, `stored` on the
// Users board.
// `ttlMinutes` lets a code live longer than a password reset's (the
// rescuer's first set-password link lasts days).
export function createResetCode(now = Date.now(), ttlMinutes = RESET_CODE_TTL_MINUTES) {
  const code = crypto.randomBytes(32).toString("base64url");
  const expiresAt = now + ttlMinutes * 60_000;

  return { code, stored: `${hashOf(code)}${SEPARATOR}${expiresAt}`, expiresAt };
}

// Whether a stored token is still usable - a new email is only sent once
// the previous code has expired (one per RESET_CODE_TTL_MINUTES).
export function isUnexpired(stored, now = Date.now()) {
  const parsed = parseStored(stored);

  return Boolean(parsed) && parsed.expiresAt > now;
}

export function codeMatches(stored, code, now = Date.now()) {
  const parsed = parseStored(stored);

  if (!parsed || parsed.expiresAt <= now || typeof code !== "string" || !code) {
    return false;
  }

  const expected = Buffer.from(parsed.hash, "hex");
  const actual = Buffer.from(hashOf(code), "hex");

  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Monday's date-with-time format for a stored expiry, in UTC like Last Login.
export function expiryColumnValue(epochMs) {
  const iso = new Date(epochMs).toISOString();

  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}
