import { query, ident } from "./db.js";
import { MIRRORED_BOARDS } from "./mondaySchema.js";

// Stored values as Monday shows them (a column's `text`), so the board
// modules return what the app's mappers made from Monday - e.g. a status's
// label, a dropdown's labels joined with ", ", a link's item names.

// Names of items on any board, by id: Map("id" -> name). One query for
// every id of a whole list.
export async function namesOf(ids) {
  const wanted = [...new Set((ids ?? []).map(Number).filter(Number.isFinite))];

  if (!wanted.length) return new Map();

  const union = MIRRORED_BOARDS.map((board) => `select monday_item_id, name from ${ident(board.table)} where monday_item_id = any($1)`).join(" union all ");
  const { rows } = await query(union, [wanted]);

  return new Map(rows.map((row) => [String(row.monday_item_id), row.name ?? ""]));
}

// Every linked id in `rows` for the given link fields (to feed namesOf).
export function linkedIdsIn(rows, fields) {
  return rows.flatMap((row) => fields.flatMap((field) => row[field] ?? []));
}

// [{ id, name }] for a link column's ids.
export function linkedItems(ids, names) {
  return (ids ?? []).map((id) => ({ id: String(id), name: names.get(String(id)) ?? "" }));
}

// A stored value as Monday's `text`. `names` is needed for links.
export function textOf(type, main, extraValue, names = new Map()) {
  if (main === null || main === undefined) return "";

  switch (type) {
    case "board_relation":
      return main.map((id) => names.get(String(id)) ?? "").filter(Boolean).join(", ");
    case "dropdown":
      return main.join(", ");
    case "date":
      return `${main}${extraValue ? ` ${String(extraValue).slice(0, 5)}` : ""}`;
    case "checkbox":
      return main ? "v" : "";
    case "numbers":
    case "numeric":
      return String(Number(main));
    case "file":
      return main.text ?? "";
    case "creation_log": {
      // Stored as a timestamp; Monday's text is "YYYY-MM-DD HH:MM:SS UTC".
      const iso = new Date(main).toISOString();

      return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
    }
    default:
      return String(main);
  }
}

// A file column's copy -> [{ name, assetId, url }], as the app's mappers
// read files from Monday (the URLs are the text's comma-separated list, in
// the order of value.files).
export function fileValues(copy) {
  const files = copy?.value?.files ?? [];

  if (!files.length) return [];

  const urls = (copy.text || "").split(", ");

  return files.map((file, index) => ({ name: file.name, assetId: file.assetId, url: urls[index] ?? null }));
}
