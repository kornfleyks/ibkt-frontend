// Anthropic's published prices in US dollars for each million tokens, for the
// models Oriel may use. The cost on the App Settings card is an estimate
// calculated from these prices and the token counts of each response, so it
// can differ slightly from the Claude Console invoice. A model that is not
// listed here has its tokens counted but no cost.
//
// Haiku 5.5 prices apply to prompts up to 100K tokens. Cache writes are
// charged at 1.25 times the input price.

const PRICES = {
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

const CACHE_WRITE_FACTOR = 1.25;

// The estimated cost in dollars of one row of usage, or null for an unknown model.
export function estimateCost(model, { inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0 }) {
  const price = PRICES[model];

  if (!price) return null;

  return (
    (inputTokens * price.input +
      outputTokens * price.output +
      cacheReadTokens * price.cacheRead +
      cacheWriteTokens * price.input * CACHE_WRITE_FACTOR) /
    1_000_000
  );
}
