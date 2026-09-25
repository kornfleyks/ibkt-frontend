import { getMondayCacheTtlMs } from "./appSettings.js";
import { withRelatedBoards } from "./boardRelations.js";

// In-memory cache for Monday GraphQL reads, shared across every client
// hitting this server (unlike a frontend-only cache, this actually reduces
// how often we hit Monday's rate limits). Mutations always bypass it.
//
// Each entry is tagged with the boards its variables name (boardId /
// boardIds), so a change only clears reads of that board and the boards
// linked to it. Reads that don't name a board (e.g. items or updates
// fetched by item id) are tagged as unknown and cleared on any change.

const ANY_BOARD = "*";

const cache = new Map();

export function isMutation(query) {
  return /^\s*mutation\b/i.test(query);
}

function cacheKey(query, variables) {
  return JSON.stringify({ query, variables });
}

function boardTags(variables) {
  const ids = [variables?.boardId, ...(Array.isArray(variables?.boardIds) ? variables.boardIds : [])]
    .filter((id) => id !== undefined && id !== null && id !== "")
    .map(String);

  return ids.length > 0 ? new Set(ids) : new Set([ANY_BOARD]);
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
  cache.set(key, { data, expiresAt: Date.now() + resolvedTtlMs, boards: boardTags(variables) });
}

// No argument: drop everything. With board ids: drop reads of those boards,
// of boards linked to them, and reads whose board is unknown.
export function clearCache(boardIds) {
  if (!boardIds) {
    cache.clear();
    return;
  }

  const stale = new Set([ANY_BOARD]);

  for (const boardId of [].concat(boardIds)) {
    for (const id of withRelatedBoards(boardId)) {
      stale.add(id);
    }
  }

  for (const [key, entry] of cache) {
    if ([...entry.boards].some((board) => stale.has(board))) {
      cache.delete(key);
    }
  }
}
