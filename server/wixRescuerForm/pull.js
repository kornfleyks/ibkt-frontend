import { insertSubmission } from "./store.js";

// Reads the rescuer requests straight from Wix, as the safety net for the
// automation (routes.js): Wix runs the automation only when its trigger fires,
// so the app also asks Wix for the collection's items. An item already stored
// (by the automation or by an earlier read) is not stored again.
//
// The Wix CMS collection that holds the form's submissions ("RescuerRequests")
// is read with the Query Data Items API, using an API key:
//
//   WIX_API_KEY   the key (Authorization header), never in the repository
//   WIX_SITE_ID   the site (wix-site-id header)
//   WIX_RESCUER_COLLECTION_ID   optional, default "RescuerRequests"

const QUERY_URL = "https://www.wixapis.com/wix-data/v2/items/query";
const PAGE_SIZE = 100;
// A guard against a runaway loop, not a real limit: 50 pages is 5000 items.
const MAX_PAGES = 50;
const EVERY_MS = 10 * 60 * 1000;
const FIRST_RUN_MS = 60 * 1000;

let running = false;

export const wixPullConfigured = () => Boolean(process.env.WIX_API_KEY && process.env.WIX_SITE_ID);

async function queryPage(collectionId, cursor) {
  const res = await fetch(QUERY_URL, {
    method: "POST",
    headers: { Authorization: process.env.WIX_API_KEY, "wix-site-id": process.env.WIX_SITE_ID, "Content-Type": "application/json" },
    body: JSON.stringify({ dataCollectionId: collectionId, query: cursor ? { cursorPaging: { cursor } } : { cursorPaging: { limit: PAGE_SIZE } } }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Wix answered ${res.status} to the query for ${collectionId}.`);

  return res.json();
}

// Stores every item of the collection not stored yet. Resolves to { read, stored }.
export async function pullRescuerSubmissions() {
  if (!wixPullConfigured()) throw new Error("WIX_API_KEY and WIX_SITE_ID are not set.");
  if (running) return { read: 0, stored: 0, skipped: true };

  running = true;

  try {
    const collectionId = process.env.WIX_RESCUER_COLLECTION_ID || "RescuerRequests";
    let read = 0;
    let stored = 0;
    let cursor = null;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const body = await queryPage(collectionId, cursor);

      for (const item of body.dataItems ?? []) {
        read += 1;
        // The same shape the automation sends for a collection item.
        if (await insertSubmission({ data: { id: item.id, dataCollectionId: collectionId, data: item.data ?? {} } })) stored += 1;
      }

      cursor = body.pagingMetadata?.cursors?.next ?? null;
      if (!cursor || !body.pagingMetadata?.hasNext) break;
    }

    return { read, stored };
  } finally {
    running = false;
  }
}

async function safePull() {
  try {
    const { stored } = await pullRescuerSubmissions();

    if (stored) console.log(`Wix rescuer form: stored ${stored} submission(s) read from Wix.`);
  } catch (err) {
    console.error("Wix rescuer form: reading from Wix failed.", err.message);
  }
}

// Every 10 minutes, only where the Wix key is set.
export function startWixRescuerPull() {
  if (!wixPullConfigured()) return;

  setTimeout(() => {
    safePull();
    setInterval(safePull, EVERY_MS).unref();
  }, FIRST_RUN_MS).unref();
}
