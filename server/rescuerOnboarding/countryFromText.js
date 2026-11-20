import { COUNTRIES } from "../../src/constants/countries.js";

// The application form asks for the country as free text; the Rescuers
// board's Country column wants a real country. Returns Monday's country
// value { countryCode, countryName } when the text is a country's name or
// code (or a common short form), else null - the caller then keeps the
// text in the notes instead of guessing.

const ALIASES = { uk: "GB", "great britain": "GB", england: "GB", scotland: "GB", wales: "GB", "northern ireland": "GB", usa: "US", uae: "AE" };
const names = new Intl.DisplayNames(["en"], { type: "region" });

const BY_NAME = new Map();

for (const [code] of COUNTRIES) {
  const name = names.of(code);

  if (name) BY_NAME.set(name.toLowerCase(), { countryCode: code, countryName: name });
}

export function countryFromText(text) {
  const key = String(text ?? "").trim().toLowerCase();

  if (!key) return null;

  if (BY_NAME.has(key)) return BY_NAME.get(key);

  const code = ALIASES[key] ?? (key.length === 2 ? key.toUpperCase() : null);

  if (!code) return null;

  const name = names.of(code);

  return name && COUNTRIES.some(([known]) => known === code) ? { countryCode: code, countryName: name } : null;
}
