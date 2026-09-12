// In-memory cache for Monday GraphQL reads, shared across every client
// hitting this server (unlike a frontend-only cache, this actually reduces
// how often we hit Monday's rate limits). Mutations always bypass it and
// clear it afterwards - simplest correct option at this scale, versus
// tracking which cached reads a given mutation could affect.
const DEFAULT_TTL_MS = Number(process.env.MONDAY_CACHE_TTL_MS) || 30_000;

const cache = new Map();

export function isMutation(query) {
  return /^\s*mutation\b/i.test(query);
}

function cacheKey(query, variables) {
  return JSON.stringify({ query, variables });
}

export function getCached(query, variables) {
  const key = cacheKey(query, variables);
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.data;
}

export function setCached(query, variables, data, ttlMs = DEFAULT_TTL_MS) {
  const key = cacheKey(query, variables);
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearCache() {
  cache.clear();
}
