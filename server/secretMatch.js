import crypto from "node:crypto";

// Constant-time comparison of a secret from a request (e.g. a webhook URL
// path segment) with the configured one. An unset secret never matches.
export function secretMatches(expected, candidate) {
  if (!expected || typeof candidate !== "string") {
    return false;
  }

  const want = Buffer.from(expected);
  const given = Buffer.from(candidate);

  return want.length === given.length && crypto.timingSafeEqual(want, given);
}
