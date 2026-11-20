import { canSeeSensitiveFields, HIDDEN_VALUE } from "../src/constants/roles.js";
import { StoreError } from "./database/boardStore.js";

// Fields only some roles may see (docs/sensitive-fields.md): today a cat's
// microchip number, for Admins only (SENSITIVE_FIELD_ROLES in
// src/constants/roles.js). The server answers them as "Hidden" to anyone else,
// so hiding is not left to the screens, and refuses their changes. Server-side
// code that works on the cats directly (the contract import matches a
// contract to a cat by microchip) reads the cats before any of this and is
// not affected.

export const HIDDEN = HIDDEN_VALUE;

// The cat fields that are sensitive (keys of CAT_FIELDS in cats.js).
const SENSITIVE_CAT_FIELDS = ["microchipNumber"];

// The cat with its sensitive fields hidden, unless `role` may see them.
export function maskCat(cat, role) {
  if (!cat || canSeeSensitiveFields(role)) return cat;

  const copy = { ...cat };

  for (const key of SENSITIVE_CAT_FIELDS) {
    if (key in copy) copy[key] = HIDDEN;
  }

  return copy;
}

export function maskCats(cats, role) {
  return canSeeSensitiveFields(role) ? cats : cats.map((cat) => maskCat(cat, role));
}

// Throws a 403 when `changes` (a cat's { field: value }) sets a sensitive field
// and `role` may not.
export function refuseSensitiveCatChanges(changes, role) {
  if (canSeeSensitiveFields(role)) return;

  const key = SENSITIVE_CAT_FIELDS.find((field) => changes && Object.hasOwn(changes, field));

  if (key) throw new StoreError("Only Admins can change the microchip number.", 403);
}

const SENSITIVE_LABEL = /microchip/i;

// Activity Log entries with the old and new value of a sensitive field hidden
// (and the description that quotes them), unless `role` may see them. Applies
// to entries already in the log as well as new ones. The raw details are
// never sent to the app by the database log; they are dropped here for the
// Monday log too.
export function redactActivity(entries, role) {
  if (canSeeSensitiveFields(role)) return entries;

  return entries.map((entry) => {
    const { rawDetails, ...rest } = entry;

    if (!SENSITIVE_LABEL.test(String(rest.fieldChanged ?? ""))) return rest;

    return {
      ...rest,
      oldValue: HIDDEN,
      newValue: HIDDEN,
      description: `${rest.actorName || "Someone"} changed ${rest.fieldChanged} on ${rest.itemName || "an item"}`,
    };
  });
}
