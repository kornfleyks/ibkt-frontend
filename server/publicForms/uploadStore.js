import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Where files from the public forms wait (docs/public-forms.md). A person
// attaches a file before the form exists as an application, so the file is
// kept here under a random token ("ibkt-upload:<uuid>") that the answers
// carry. The Jotform handlers copy it into the application's Monday file
// column through jotform/uploads.js, which then deletes it. A file nobody
// used is deleted after MAX_AGE_MS. Files live in the server's temporary
// folder, never in the repository, and are not served by any route.

export const UPLOAD_SCHEME = "ibkt-upload:";

const DIRECTORY = join(tmpdir(), "ibkt-public-uploads");
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUploadToken(value) {
  return typeof value === "string" && value.startsWith(UPLOAD_SCHEME) && ID_PATTERN.test(value.slice(UPLOAD_SCHEME.length));
}

const idOf = (token) => token.slice(UPLOAD_SCHEME.length);

let lastCleanup = 0;

// Deletes files older than MAX_AGE_MS. At most once an hour; never throws.
async function cleanup() {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return;

  lastCleanup = Date.now();

  try {
    for (const name of await readdir(DIRECTORY)) {
      const path = join(DIRECTORY, name);

      if (Date.now() - (await stat(path)).mtimeMs > MAX_AGE_MS) await rm(path, { force: true });
    }
  } catch (err) {
    console.error("Public forms: clearing old uploads failed.", err.message);
  }
}

// { buffer, mimetype, originalname } -> "ibkt-upload:<uuid>"
export async function saveUpload({ buffer, mimetype, originalname }) {
  await mkdir(DIRECTORY, { recursive: true });
  cleanup();

  const id = randomUUID();

  await writeFile(join(DIRECTORY, `${id}.bin`), buffer);
  await writeFile(join(DIRECTORY, `${id}.json`), JSON.stringify({ mimetype, originalname }));

  return `${UPLOAD_SCHEME}${id}`;
}

// { buffer, mimetype, originalname } or null when the token is unknown (or expired).
export async function readUpload(token) {
  if (!isUploadToken(token)) return null;

  try {
    const meta = JSON.parse(await readFile(join(DIRECTORY, `${idOf(token)}.json`), "utf8"));

    return { buffer: await readFile(join(DIRECTORY, `${idOf(token)}.bin`)), mimetype: meta.mimetype, originalname: meta.originalname };
  } catch {
    return null;
  }
}

export async function uploadExists(token) {
  if (!isUploadToken(token)) return false;

  try {
    await stat(join(DIRECTORY, `${idOf(token)}.bin`));
    return true;
  } catch {
    return false;
  }
}

export async function deleteUpload(token) {
  if (!isUploadToken(token)) return;

  await rm(join(DIRECTORY, `${idOf(token)}.bin`), { force: true });
  await rm(join(DIRECTORY, `${idOf(token)}.json`), { force: true });
}
