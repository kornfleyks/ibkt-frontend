import { parse, print, visit, Kind } from "graphql";
import { mondayFetch } from "./mondayRateLimit.js";
import { mondayHeaders } from "./mondayApiVersion.js";
import { cacheKey, getCached, setCached } from "./mondayCache.js";

// Read path for Monday queries coming from the app. Saves calls three ways:
//   1. cache - a fresh cached answer is returned without calling Monday;
//   2. in-flight joining - a read identical to one already on its way to
//      Monday (e.g. three parts of a page asking for App Settings at once,
//      or two people opening the same page) waits for that answer instead
//      of making its own call;
//   3. merging - the remaining reads of a batch go to Monday as ONE request:
//      each query's variables are renamed and its top-level fields aliased
//      (q0_boards, q1_items, ...) so they can't collide, then the answer is
//      split back per query. Monday's daily limit counts requests, not their
//      size, so a Dashboard's 7-9 reads cost 1.
// If Monday rejects a merged request (e.g. one query is invalid, or the
// combination is too complex), each read is retried on its own, so one bad
// read can't fail the others.

const inflight = new Map();

async function sendToMonday(query, variables) {
  const response = await mondayFetch(process.env.MONDAY_API_URL, {
    method: "POST",
    headers: mondayHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
}

function queryError(message) {
  return Object.assign(new Error(message), { status: 502 });
}

// Merges plain queries (one query operation, no fragment definitions) into
// one document. Returns null when any of them can't be merged safely.
export function mergeQueries(requests) {
  const operations = [];

  for (const request of requests) {
    let document;

    try {
      document = parse(request.query);
    } catch {
      return null;
    }

    const definitions = document.definitions;

    if (definitions.length !== 1 || definitions[0].kind !== Kind.OPERATION_DEFINITION || definitions[0].operation !== "query") {
      return null;
    }

    operations.push(definitions[0]);
  }

  const variableDefinitions = [];
  const selections = [];
  const variables = {};
  // Per request: [{ alias in the merged answer, key the request expects }]
  const keys = [];

  operations.forEach((operation, index) => {
    const prefix = `q${index}_`;
    const renamed = visit(operation, {
      [Kind.VARIABLE]: (node) => ({ ...node, name: { ...node.name, value: prefix + node.name.value } }),
    });

    variableDefinitions.push(...(renamed.variableDefinitions ?? []));

    for (const [name, value] of Object.entries(requests[index].variables ?? {})) {
      variables[prefix + name] = value;
    }

    keys.push(
      renamed.selectionSet.selections.map((selection) => {
        const key = selection.alias?.value ?? selection.name.value;
        const alias = prefix + key;

        selections.push({ ...selection, alias: { kind: Kind.NAME, value: alias } });

        return { alias, key };
      }),
    );
  });

  const query = print({
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation: "query",
        variableDefinitions,
        selectionSet: { kind: Kind.SELECTION_SET, selections },
        directives: [],
      },
    ],
  });

  const split = (data) => keys.map((fields) => Object.fromEntries(fields.map(({ alias, key }) => [key, data?.[alias] ?? null])));

  return { query, variables, split };
}

async function fetchOne(request) {
  const result = await sendToMonday(request.query, request.variables);

  if (result.errors) {
    console.error(result.errors);
    throw queryError(result.errors[0].message);
  }

  return result.data;
}

// Resolves every request in `misses` from Monday - merged when possible.
async function fetchMany(misses) {
  if (misses.length === 1) {
    return [await settle(() => fetchOne(misses[0]))];
  }

  const merged = mergeQueries(misses);

  if (merged) {
    const result = await sendToMonday(merged.query, merged.variables);

    if (!result.errors) {
      return merged.split(result.data).map((data) => ({ data }));
    }

    console.warn("Merged Monday read was rejected; retrying each read on its own.", result.errors[0]?.message);
  }

  const results = [];

  for (const request of misses) {
    results.push(await settle(() => fetchOne(request)));
  }

  return results;
}

async function settle(task) {
  try {
    return { data: await task() };
  } catch (err) {
    if (err.rateLimited) {
      throw err;
    }

    return { error: err };
  }
}

// requests: [{ query, variables, cacheTtlMs }] (reads only). Resolves to one
// { data } or { error } per request, in order. A Monday rate limit rejects
// the whole call (err.rateLimited), since nothing can be fetched.
export async function readMany(requests) {
  const results = new Array(requests.length);
  const waits = [];
  const misses = [];

  requests.forEach((request, index) => {
    const key = cacheKey(request.query, request.variables);
    const cached = getCached(request.query, request.variables);

    if (cached !== undefined) {
      results[index] = { data: cached };
      return;
    }

    if (inflight.has(key)) {
      waits.push(inflight.get(key).then((result) => { results[index] = result; }));
      return;
    }

    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });

    // Joined reads must not see an unhandled rejection if nobody else waits.
    promise.catch(() => {});
    inflight.set(key, promise);
    misses.push({ request, index, key, resolve, reject });
  });

  if (misses.length > 0) {
    try {
      const fetched = await fetchMany(misses.map((miss) => miss.request));

      await Promise.all(
        misses.map(async (miss, position) => {
          const result = fetched[position];

          if (result.data !== undefined) {
            await setCached(miss.request.query, miss.request.variables, result.data, miss.request.cacheTtlMs);
          }

          results[miss.index] = result;
          miss.resolve(result);
        }),
      );
    } catch (err) {
      for (const miss of misses) {
        miss.reject(err);
      }

      throw err;
    } finally {
      for (const miss of misses) {
        inflight.delete(miss.key);
      }
    }
  }

  await Promise.all(waits);

  return results;
}

export async function readOne(request) {
  const [result] = await readMany([request]);

  if (result.error) {
    throw result.error;
  }

  return result.data;
}
