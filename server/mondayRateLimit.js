import { recordMondayCall } from "./mondayUsage.js";

// Every server request to Monday goes through mondayFetch. When Monday
// answers 429 (daily call limit, per-minute limit, ...), it says how long
// to wait (Retry-After). Until then every Monday call fails straight away
// with a MondayRateLimitError instead of hitting Monday again - retrying
// can't succeed, and the error carries a message people can act on.

const DEFAULT_RETRY_AFTER_SECONDS = 60;

let blockedUntil = 0;

function describeWait(seconds) {
  if (seconds >= 5400) {
    return `about ${Math.round(seconds / 3600)} hours`;
  }

  if (seconds >= 90) {
    return `about ${Math.round(seconds / 60)} minutes`;
  }

  return "a minute";
}

export class MondayRateLimitError extends Error {
  constructor(retryAfterSeconds) {
    super(`Monday's API limit has been reached. Try again in ${describeWait(retryAfterSeconds)}.`);
    this.name = "MondayRateLimitError";
    this.rateLimited = true;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Seconds until Monday may be called again; 0 when not blocked.
export function mondayRetryAfterSeconds() {
  return Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
}

// Drop-in for fetch() on Monday URLs.
export async function mondayFetch(url, init) {
  const waiting = mondayRetryAfterSeconds();

  if (waiting > 0) {
    throw new MondayRateLimitError(waiting);
  }

  const response = await fetch(url, init);

  if (response.status === 429) {
    const header = Number(response.headers.get("retry-after"));
    const seconds = Number.isFinite(header) && header > 0 ? Math.ceil(header) : DEFAULT_RETRY_AFTER_SECONDS;

    blockedUntil = Date.now() + seconds * 1000;
    console.warn(`Monday rate limit reached; pausing all Monday calls for ${seconds}s.`);

    throw new MondayRateLimitError(seconds);
  }

  // Answered (successfully or with GraphQL errors) - uses one call of
  // today's allowance.
  recordMondayCall();

  return response;
}
