import { getMondayCacheTtlMs } from "./appSettings.js";

// In-memory cache for Monday GraphQL reads, shared across every client
// hitting this server (unlike a frontend-only cache, this actually reduces
// how often we hit Monday's rate limits). Mutations always bypass it and
// clear it afterwards - simplest correct option at this scale, versus
// tracking which cached reads a given mutation could affect.

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

export async function setCached(query, variables, data, ttlMs) {
  const resolvedTtlMs = ttlMs ?? (await getMondayCacheTtlMs());
  const key = cacheKey(query, variables);
  cache.set(key, { data, expiresAt: Date.now() + resolvedTtlMs });
}

export function clearCache() {
  cache.clear();
}
