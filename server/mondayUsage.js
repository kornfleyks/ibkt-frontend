import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MONDAY_DAILY_CALL_LIMIT } from "../src/constants/mondayApiUsage.js";

// Today's Monday API call count, kept by the server itself: every request
// mondayFetch actually gets an answer for adds one (429 refusals don't use
// the allowance, so they aren't counted). The day is the UTC day, which is
// when Monday's daily limit resets.
//
// At startup mondayUsageSync.js reads Monday's own figures once and calls
// seedMondayUsage: the count then starts from Monday's usage for today
// (which includes other servers on the same account and anything before a
// restart), and the limit is the account's real one.
//
// Also kept in a small local file, so a restart without Monday's figures
// (e.g. while rate-limited) doesn't drop back to zero. On hosts that wipe
// the disk on restart (Render's free plan) the startup seed covers it.

const USAGE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".monday-usage.json");
const SAVE_DELAY_MS = 1_000;

let usage = load();
let saveTimer = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fresh() {
  return { day: today(), count: 0, limit: usage?.limit ?? null };
}

function load() {
  try {
    const stored = JSON.parse(fs.readFileSync(USAGE_FILE, "utf8"));

    if (stored.day === today() && Number.isInteger(stored.count)) {
      return { day: stored.day, count: stored.count, limit: Number.isInteger(stored.limit) ? stored.limit : null };
    }
  } catch {
    // No file yet, or unreadable - start from zero.
  }

  return { day: today(), count: 0, limit: null };
}

function save() {
  saveTimer = null;

  fs.writeFile(USAGE_FILE, JSON.stringify(usage), (err) => {
    if (err) {
      console.error("Monday usage: failed to save the counter.", err.message);
    }
  });
}

function scheduleSave() {
  if (!saveTimer) {
    saveTimer = setTimeout(save, SAVE_DELAY_MS);
    saveTimer.unref();
  }
}

function rollOverIfNewDay() {
  if (usage.day !== today()) {
    usage = fresh();
  }
}

export function recordMondayCall() {
  rollOverIfNewDay();
  usage.count += 1;
  scheduleSave();
}

// Monday's own figures. `count` (today's usage) only ever raises the count,
// so it never goes backwards; `limit` replaces the built-in default.
export function seedMondayUsage({ count, limit }) {
  rollOverIfNewDay();

  if (Number.isInteger(count) && count > usage.count) {
    usage.count = count;
  }

  if (Number.isInteger(limit) && limit > 0) {
    usage.limit = limit;
  }

  scheduleSave();
}

// { day, count, limit } for today.
export function getMondayUsage() {
  rollOverIfNewDay();

  return { day: usage.day, count: usage.count, limit: usage.limit ?? MONDAY_DAILY_CALL_LIMIT };
}
