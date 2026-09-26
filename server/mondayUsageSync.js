import { mondayDirectRequest } from "./mondayClient.js";
import { seedMondayUsage } from "./mondayUsage.js";

// One Monday call per server start: the account's daily limit and, when
// Monday reports it, today's official usage (see mondayUsage.js). If
// Monday is rate-limiting at startup, it tries once more right after the
// block ends. Never throws.

const TODAY_ENTRY_MISSING = "Monday's usage report has no entry for today; counting from this server's own total.";

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function syncMondayUsageFromMonday() {
  try {
    const data = await mondayDirectRequest(`query {
      platform_api {
        daily_limit { total }
        daily_analytics { last_updated by_day { day usage } }
      }
    }`);

    const platform = data.platform_api ?? {};
    const limit = platform.daily_limit?.total;
    const todayEntry = (platform.daily_analytics?.by_day ?? []).find((entry) => String(entry.day).slice(0, 10) === todayUtc());
    const count = todayEntry ? Number(todayEntry.usage) : undefined;

    seedMondayUsage({ count, limit });

    console.log(
      `Monday usage: limit ${limit ?? "unknown"}, today's official usage ${count ?? "not reported"}` +
        (platform.daily_analytics?.last_updated ? ` (as of ${platform.daily_analytics.last_updated}).` : "."),
    );

    if (!todayEntry) {
      console.log(TODAY_ENTRY_MISSING);
    }
  } catch (err) {
    if (err.rateLimited) {
      console.warn(`Monday usage: rate-limited at startup; reading Monday's figures again in ${err.retryAfterSeconds}s.`);
      setTimeout(syncMondayUsageFromMonday, err.retryAfterSeconds * 1000 + 5_000).unref();
      return;
    }

    console.error("Monday usage: couldn't read Monday's figures.", err.message);
  }
}
