import { getLoginMaxAttempts, getLoginLockoutMinutes } from "./appSettings.js";

// Per-account lockout state, in memory - resets on server restart, same
// tradeoff already accepted for mondayCache.js. This is account lockout
// (protecting one account from password guessing), not general request
// throttling. Keyed by normalized email for /api/login; the Account page's
// "current password" checks use the same key (the account's own email), so
// guesses made through a stolen session count against the same limit.
const attempts = new Map();

function keyOf(email) {
  return email.trim().toLowerCase();
}

// Minutes left on an active lockout, or null when not locked.
export async function checkLockout(email) {
  const entry = attempts.get(keyOf(email));

  if (!entry?.lockedUntil || entry.lockedUntil <= Date.now()) {
    return null;
  }

  return Math.ceil((entry.lockedUntil - Date.now()) / 60_000);
}

export async function recordFailedAttempt(email) {
  const key = keyOf(email);
  const entry = attempts.get(key) ?? { failureCount: 0, lockedUntil: null };

  entry.failureCount += 1;

  const maxAttempts = await getLoginMaxAttempts();

  if (entry.failureCount >= maxAttempts) {
    const lockoutMinutes = await getLoginLockoutMinutes();

    entry.lockedUntil = Date.now() + lockoutMinutes * 60_000;
    entry.failureCount = 0;
  }

  attempts.set(key, entry);
}

export function clearAttempts(email) {
  attempts.delete(keyOf(email));
}

export function lockoutMessage(minutesRemaining) {
  return `Too many failed password attempts. Try again in ${minutesRemaining} minute(s).`;
}
