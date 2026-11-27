import { isDatabaseEnabled, query } from "../database/db.js";
import { estimateCost } from "./prices.js";

// What Oriel's calls to the Claude API used, kept for each day (UTC), provider
// and model in the table ai_usage_daily. Only calls Oriel makes are counted,
// so the figures do not include other use of the same Anthropic account.
// Recording never throws: a failure to count must not fail a review.

const ERROR_MAX_LENGTH = 300;

function number(value) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

// `usage` is the usage object of a Claude response (input_tokens,
// output_tokens, cache_read_input_tokens, cache_creation_input_tokens).
export async function recordAiUsage({ provider, model, usage = {}, ok = true, error = null }) {
  if (!isDatabaseEnabled()) return;

  try {
    await query(
      `insert into ai_usage_daily
         (day, provider, model, calls, failed, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, last_error, last_error_at, last_call_at)
       values ((now() at time zone 'utc')::date, $1, $2, 1, $3, $4, $5, $6, $7, $8, case when $3 = 1 then now() end, now())
       on conflict (day, provider, model) do update set
         calls = ai_usage_daily.calls + 1,
         failed = ai_usage_daily.failed + $3,
         input_tokens = ai_usage_daily.input_tokens + $4,
         output_tokens = ai_usage_daily.output_tokens + $5,
         cache_read_tokens = ai_usage_daily.cache_read_tokens + $6,
         cache_write_tokens = ai_usage_daily.cache_write_tokens + $7,
         last_error = case when $3 = 1 then $8 else ai_usage_daily.last_error end,
         last_error_at = case when $3 = 1 then now() else ai_usage_daily.last_error_at end,
         last_call_at = now()`,
      [
        provider,
        model || "unknown",
        ok ? 0 : 1,
        number(usage.input_tokens),
        number(usage.output_tokens),
        number(usage.cache_read_input_tokens),
        number(usage.cache_creation_input_tokens),
        ok ? null : String(error ?? "Unknown error").slice(0, ERROR_MAX_LENGTH),
      ],
    );
  } catch (err) {
    console.error("AI usage: failed to record a call.", err.message);
  }
}

function summarise(rows) {
  const total = { calls: 0, failed: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, costKnown: true };

  for (const row of rows) {
    const tokens = {
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      cacheReadTokens: Number(row.cache_read_tokens),
      cacheWriteTokens: Number(row.cache_write_tokens),
    };
    const cost = estimateCost(row.model, tokens);

    total.calls += Number(row.calls);
    total.failed += Number(row.failed);
    total.inputTokens += tokens.inputTokens;
    total.outputTokens += tokens.outputTokens;
    total.cacheReadTokens += tokens.cacheReadTokens;
    total.cacheWriteTokens += tokens.cacheWriteTokens;

    if (cost === null) {
      if (tokens.inputTokens + tokens.outputTokens > 0) total.costKnown = false;
    } else {
      total.cost += cost;
    }
  }

  return total;
}

// { enabled, today, month, models, lastCallAt, lastError } for the App Settings card.
export async function getAiUsage() {
  if (!isDatabaseEnabled()) return { enabled: false };

  const [month, last, lastError] = await Promise.all([
    query(
      `select day::text, model, calls, failed, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
       from ai_usage_daily
       where day >= date_trunc('month', (now() at time zone 'utc'))::date`,
    ),
    query("select max(last_call_at) as at from ai_usage_daily"),
    query("select last_error, last_error_at from ai_usage_daily where last_error is not null order by last_error_at desc limit 1"),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return {
    enabled: true,
    today: summarise(month.rows.filter((row) => row.day === today)),
    month: summarise(month.rows),
    models: [...new Set(month.rows.map((row) => row.model))],
    lastCallAt: last.rows[0]?.at ?? null,
    lastError: lastError.rows[0] ? { message: lastError.rows[0].last_error, at: lastError.rows[0].last_error_at } : null,
  };
}
