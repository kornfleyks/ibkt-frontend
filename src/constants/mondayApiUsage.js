// The Monday account's daily API call limit (platform_api.daily_limit on
// the current plan). Update this if the plan changes.
export const MONDAY_DAILY_CALL_LIMIT = 1000;

// Response header carrying the server's running count for today, as
// "<used>/<limit>" - sent to Admins only (see server/mondayUsage.js).
export const MONDAY_USAGE_HEADER = "X-Monday-Usage";

// Sent alongside it while Monday is refusing calls (429): seconds until
// Monday said the block ends (its Retry-After).
export const MONDAY_BLOCKED_HEADER = "X-Monday-Blocked-For";

// When Monday's daily allowance resets: midnight UTC.
export function nextMondayLimitReset(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}
