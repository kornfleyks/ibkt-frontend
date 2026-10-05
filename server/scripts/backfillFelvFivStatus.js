// One-off: copies each cat's old combined "FeLV/FIV Status (old)" value into
// both new fields (FeLV Status, FIV Status) - agreed 2026-10-05: a straight
// copy, not reset to Unknown, since most cats were tested together and this
// is faster to spot-check/correct than to re-verify from scratch. Any cat
// that was actually split-positive needs manual correction afterwards; there
// is no way to recover that distinction from the old single value.
//
// Run after scripts/createFelvFivColumns.js and
// `node scripts/databaseSchema.js --refresh`. Changes go through changeCat
// (server/cats.js), so each one is logged to the Activity Log and queued for
// Monday like any other edit. Safe to re-run: a cat whose two new fields are
// no longer both empty/Unknown is left alone.
//
//   node scripts/backfillFelvFivStatus.js
import "dotenv/config";
import { CATS } from "../../src/constants/boards/cats.js";
import { listCats, changeCat, CAT_FIELDS } from "../cats.js";
import { closeDatabase } from "../database/db.js";
import { readRecord } from "../database/boardRecords.js";

const actor = { id: "system", name: "FeLV/FIV migration script" };

const OLD_FIELD_KEY = "felvFivStatusOld";
const FIELDS_WITH_OLD = { ...CAT_FIELDS, [OLD_FIELD_KEY]: { column: CATS.COLUMNS.FELV_FIV_STATUS_OLD, empty: "Unknown" } };

let updated = 0;
let skipped = 0;

const cats = await listCats();

for (const cat of cats) {
  const full = await readRecord("cats", FIELDS_WITH_OLD, cat.id);
  const oldValue = full[OLD_FIELD_KEY];

  const alreadySet = (cat.felvStatus && cat.felvStatus !== "Unknown") || (cat.fivStatus && cat.fivStatus !== "Unknown");

  if (alreadySet) {
    skipped += 1;
    continue;
  }

  if (!oldValue || oldValue === "Unknown") {
    skipped += 1;
    continue;
  }

  await changeCat(actor, cat.id, { felvStatus: oldValue, fivStatus: oldValue });
  updated += 1;
  console.log(`${cat.name} (${cat.id}): FeLV/FIV set to "${oldValue}"`);
}

console.log(`\nUpdated ${updated} cats, skipped ${skipped} (already set or old value was empty/Unknown).`);

// logChanges (boardRecords.js) fires off the Activity Log insert without
// awaiting it - fine on the long-running server, but this script would
// otherwise close the pool while the last entry is still in flight.
await new Promise((resolve) => setTimeout(resolve, 2000));
await closeDatabase();
