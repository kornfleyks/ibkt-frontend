import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MONDAY_DAILY_CALL_LIMIT } from "../src/constants/mondayApiUsage.js";

// Counts the Monday API calls this server makes today, without asking
// Monday: every request mondayFetch actually gets an answer for adds one
// (429 refusals don't use the allowance, so they aren't counted). The day
// is the UTC day, which is when Monday's daily limit resets.
//
// Kept in a small local file so the count survives restarts (the dev
// server restarts on every save in watch mode). Only this server's calls
// are counted - another server using the same Monday account (e.g. Render
// vs local) isn't included.

const USAGE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), ".monday-usage.json");
const SAVE_DELAY_MS = 1_000;

let usage = load();
let saveTimer = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    const stored = JSON.parse(fs.readFileSync(USAGE_FILE, "utf8"));

    if (stored.day === today() && Number.isInteger(stored.count)) {
      return stored;
    }
  } catch {
    // No file yet, or unreadable - start from zero.
  }

  return { day: today(), count: 0 };
}

function save() {
  saveTimer = null;

  fs.writeFile(USAGE_FILE, JSON.stringify(usage), (err) => {
    if (err) {
      console.error("Monday usage: failed to save the counter.", err.message);
    }
  });
}

function rollOverIfNewDay() {
  if (usage.day !== today()) {
    usage = { day: today(), count: 0 };
  }
}

export function recordMondayCall() {
  rollOverIfNewDay();
  usage.count += 1;

  if (!saveTimer) {
    saveTimer = setTimeout(save, SAVE_DELAY_MS);
    saveTimer.unref();
  }
}

// { day, count, limit } for today.
export function getMondayUsage() {
  rollOverIfNewDay();

  return { day: usage.day, count: usage.count, limit: MONDAY_DAILY_CALL_LIMIT };
}
