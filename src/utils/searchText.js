// Every text value a record carries (nested objects and arrays included),
// lower-cased and joined, so a single `.includes(term)` searches the whole
// record - contact details, linked items, summaries, notes, answers...
// Used by the list pages' search boxes (Active Applications, Cats,
// Matching, Adoptions).
export function searchText(record) {
  const parts = [];

  (function collect(value) {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) return value.forEach(collect);
    if (typeof value === "object") return Object.values(value).forEach(collect);

    parts.push(String(value));
  })(record);

  return parts.join(" | ").toLowerCase();
}
