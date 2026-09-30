import { addFileToColumn } from "../mondayFiles.js";
import { refreshFileCopy } from "../database/fileCopies.js";

// Files applicants upload to a Jotform form live on Jotform. The import
// handlers copy them into an application's Monday file column.

const API_KEY = process.env.JOTFORM_API_KEY;

// Only real Jotform upload links (https).
export function uploadUrls(answer) {
  const values = Array.isArray(answer) ? answer : answer ? [answer] : [];

  return values.map((value) => String(value).trim()).filter((url) => /^https:\/\//.test(url));
}

// A Jotform-hosted upload -> { buffer, mimetype, originalname } for Monday.
// Jotform may ask for the API key before it serves an account's uploads.
async function downloadUpload(url) {
  const res = await fetch(url, { headers: API_KEY ? { APIKEY: API_KEY } : {} });
  const type = res.headers.get("content-type") ?? "application/octet-stream";

  // A login page instead of the file means Jotform refused it.
  if (!res.ok || type.startsWith("text/html")) throw new Error(`Jotform answered ${res.status} (${type}).`);

  const name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "upload");

  return { buffer: Buffer.from(await res.arrayBuffer()), mimetype: type, originalname: name };
}

// Copies each upload to the application's file column; one failure doesn't
// stop the rest. Answers the URLs copied.
export async function copyUploads(applicationId, columnId, urls) {
  const copied = [];

  for (const url of urls) {
    try {
      await addFileToColumn(applicationId, columnId, await downloadUpload(url));
      copied.push(url);
    } catch (err) {
      console.error(`Jotform import: couldn't copy a file to application ${applicationId} (${columnId}).`, err.message);
    }
  }

  if (copied.length > 0) await refreshFileCopy(applicationId, columnId);

  return copied;
}
