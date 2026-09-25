// Monday GraphQL API version the server pins every request to (sent as the
// API-Version header). Monday ships a new version each quarter (YYYY-01,
// -04, -07, -10); without a pin, requests silently move to whatever is
// "Current". The live value is the MONDAY_API_VERSION App Setting - this is
// the fallback until that loads, or if it's missing or invalid.
export const DEFAULT_MONDAY_API_VERSION = "2026-07";

const VERSION_PATTERN = /^\d{4}-(01|04|07|10)$/;

export function isValidMondayApiVersion(value) {
  return VERSION_PATTERN.test(String(value ?? "").trim());
}
