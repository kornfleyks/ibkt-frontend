import { DEFAULT_MONDAY_API_VERSION, isValidMondayApiVersion } from "../src/constants/mondayApiVersion.js";

// The Monday API version every server request is pinned to. Kept in memory
// and updated by appSettings.js whenever the MONDAY_API_VERSION App Setting
// is (re)loaded; until then - or if the setting is missing/invalid - the
// built-in default applies. This module deliberately imports nothing that
// talks to Monday, so every Monday caller (appSettings.js included) can use
// it without circular imports.

let pinnedVersion = DEFAULT_MONDAY_API_VERSION;

export function getMondayApiVersion() {
  return pinnedVersion;
}

export function setPinnedMondayApiVersion(value) {
  const next = String(value ?? "").trim();
  const resolved = isValidMondayApiVersion(next) ? next : DEFAULT_MONDAY_API_VERSION;

  if (next && !isValidMondayApiVersion(next)) {
    console.warn(`Monday API version setting "${next}" is invalid; using ${DEFAULT_MONDAY_API_VERSION}.`);
  }

  if (resolved !== pinnedVersion) {
    console.log(`Monday API version pinned to ${resolved}.`);
    pinnedVersion = resolved;
  }
}

// Headers for every Monday request: the server token plus the pinned
// API-Version. `json: false` for multipart uploads (fetch sets the type).
export function mondayHeaders({ json = true } = {}) {
  return {
    Authorization: process.env.MONDAY_API_TOKEN,
    "API-Version": pinnedVersion,
    ...(json && { "Content-Type": "application/json" }),
  };
}
