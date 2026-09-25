import { serverGet } from "./MondayService";

// Admin-only. { pinned, current, pinnedKind, status, checkedAt, checkError }
// where status is up_to_date | update_due | deprecated | preview | unknown
// (see server/mondayApiVersionCheck.js).
export async function getMondayApiVersionStatus() {
  return serverGet("/api/admin/monday-api-version");
}

// How each status reads to an admin. `severity` null = nothing to flag.
export function describeMondayApiVersionStatus({ status, pinned, current }) {
  switch (status) {
    case "update_due":
      return {
        severity: "warning",
        text: `Monday API ${pinned} is now in maintenance. Update the Monday API Version setting to ${current} after checking Monday's release notes.`,
      };
    case "deprecated":
      return {
        severity: "error",
        text: `Monday API ${pinned} is deprecated${current ? ` - update the Monday API Version setting to ${current} now` : ""}.`,
      };
    case "preview":
      return {
        severity: "info",
        text: `Monday API ${pinned} is a release candidate and may still change (current is ${current}).`,
      };
    case "up_to_date":
      return { severity: null, text: `Up to date - ${pinned} is Monday's current version.` };
    default:
      return { severity: null, text: "Not checked yet - the server checks Monday's versions daily." };
  }
}
