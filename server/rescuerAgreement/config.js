import crypto from "node:crypto";
import fs from "node:fs";

// The Rescuer Agreement that an approved rescuer signs before signing up to
// Oriel (docs/rescuer-agreement.md).

// The agreement as it is shown and signed. When the wording changes, raise
// the version, replace the PDF, and keep the ids of the points that mean the
// same thing. The text of each point is stored with the signature, so an old
// signature always shows what was agreed. The wording is a placeholder until
// the client sends the final text.
export const AGREEMENT = {
  version: "1.0-draft",
  // Shown next to the version; null until the final wording has a date.
  date: null,
  // Relative to the app's base address (the file is in public/).
  file: "agreements/rescuer-agreement.pdf",
  points: [
    { id: "standard", text: "[What you agree to: the IBKT standard for every cat]" },
    { id: "takes-on", text: "[What IBKT takes on: profiles, vetting, checks, travel]" },
    { id: "money", text: "[Money: paid to vets and agents directly against invoices]" },
    { id: "follow-up", text: "[Lifetime follow-up and the UK safety net]" },
  ],
};

const DAY_MS = 24 * 60 * 60 * 1000;

// A number of days from the environment, so it can be changed on the server
// without a new release. A missing or invalid value gives the default.
function daysFromEnv(name, fallback) {
  const days = Number(process.env[name]);

  return (Number.isFinite(days) && days > 0 ? days : fallback) * DAY_MS;
}

// RESCUER_AGREEMENT_LINK_DAYS: how long the link to the agreement works (default 14).
export const agreementLinkMs = () => daysFromEnv("RESCUER_AGREEMENT_LINK_DAYS", 14);

// RESCUER_SIGNUP_LINK_DAYS: how long the sign-up link works after signing (default 14).
export const signupLinkMs = () => daysFromEnv("RESCUER_SIGNUP_LINK_DAYS", 14);

const FILE_URL = new URL(`../../public/${AGREEMENT.file}`, import.meta.url);
let fileHash;

// A fingerprint (SHA-256) of the agreement PDF, saved with each signature to
// show which file was signed. Null when the file is not on the server.
export function agreementFileHash() {
  if (fileHash === undefined) {
    try {
      fileHash = crypto.createHash("sha256").update(fs.readFileSync(FILE_URL)).digest("hex");
    } catch {
      fileHash = null;
    }
  }

  return fileHash;
}
