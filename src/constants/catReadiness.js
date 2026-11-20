import { CATS_STATUS_OPTIONS } from "./statuses/catsStatuses.js";

// What a cat needs before it can be set to Adoption Ready (docs/adoption-ready-gate.md,
// the client brief: "prevent listing unless all required fields complete").
// Shared by the server (refuses the status change) and the app (explains it).
// A cat is a record as the cats routes answer it (server/cats.js CAT_FIELDS).
//
// Decided 2026-11-11: the proposed full list (profile, medical, passport,
// media); "Unknown", "Not Tested Yet" and "Pending" count as missing; blocked
// for everyone, an Admin may override with a reason.

const STATUS = CATS_STATUS_OPTIONS.STATUS;

// What the client's own Kitty Profile form asks for.
export const MIN_PHOTOS = 6;
export const MIN_VIDEOS = 3;

// A cat in one of these statuses was Adoption Ready already (it is only
// coming back from a match that fell through), so the check does not apply.
export const READY_EXEMPT_FROM = [STATUS.ADOPTION_READY, STATUS.RESERVED, STATUS.ADOPTED];

const text = (value) => String(value ?? "").trim();
const answered = (value) => !["", "N/A", "Unknown"].includes(text(value));
const oneOf = (...allowed) => (value) => allowed.includes(text(value));
const count = (files) => (Array.isArray(files) ? files.length : 0);
// A microchip number that is really one (not "N/A", "none" or "-").
const isChip = (value) => !["", "n/a", "none", "no", "-"].includes(text(value).toLowerCase());

// [{ key, group, label, ok(cat), detail?(cat) }] in the order they are shown.
const RULES = [
  { key: "gender", group: "Profile", label: "Gender", ok: (cat) => answered(cat.gender) },
  { key: "age", group: "Profile", label: "Age", ok: (cat) => answered(cat.age) },
  { key: "breed", group: "Profile", label: "Breed", ok: (cat) => answered(cat.breed) },
  { key: "colour", group: "Profile", label: "Colour", ok: (cat) => answered(cat.colour) },
  { key: "energyLevel", group: "Profile", label: "Energy level", ok: (cat) => answered(cat.energyLevel) },
  { key: "personalitySummary", group: "Profile", label: "Personality summary", ok: (cat) => text(cat.personalitySummary) !== "" },
  { key: "childFriendly", group: "Profile", label: "Child friendly", ok: (cat) => answered(cat.childFriendly) },
  { key: "catFriendly", group: "Profile", label: "Cat friendly", ok: (cat) => answered(cat.catFriendly) },
  { key: "dogFriendly", group: "Profile", label: "Dog friendly", ok: (cat) => answered(cat.dogFriendly) },
  { key: "vaccinated", group: "Medical", label: "Vaccinated (Yes or Planned)", ok: (cat) => oneOf("Yes", "Planned")(cat.vaccinated) },
  { key: "sterilized", group: "Medical", label: "Sterilised (Yes or Planned)", ok: (cat) => oneOf("Yes", "Planned")(cat.sterilized) },
  { key: "felvStatus", group: "Medical", label: "FeLV tested (Negative or Positive)", ok: (cat) => oneOf("Negative", "Positive")(cat.felvStatus) },
  { key: "fivStatus", group: "Medical", label: "FIV tested (Negative or Positive)", ok: (cat) => oneOf("Negative", "Positive")(cat.fivStatus) },
  { key: "medicalSummary", group: "Medical", label: "Medical summary", ok: (cat) => text(cat.medicalSummary) !== "" },
  { key: "microchipNumber", group: "Medical", label: "Microchip number", ok: (cat) => isChip(cat.microchipNumber) },
  { key: "passportComplete", group: "Passport", label: "Passport marked complete", ok: (cat) => cat.passportComplete === true },
  { key: "passportFile", group: "Passport", label: "Passport file uploaded", ok: (cat) => count(cat.passportFile) >= 1 },
  { key: "photos", group: "Media", label: `At least ${MIN_PHOTOS} photos`, ok: (cat) => count(cat.photos) >= MIN_PHOTOS, detail: (cat) => `${count(cat.photos)} uploaded` },
  { key: "videos", group: "Media", label: `At least ${MIN_VIDEOS} videos`, ok: (cat) => count(cat.videos) >= MIN_VIDEOS, detail: (cat) => `${count(cat.videos)} uploaded` },
];

// What is missing, as [{ key, group, label, detail? }]; empty when the cat is
// ready. Needs the cat's real values: on the server, not the app's copy, where
// a hidden microchip number would read as present.
export function readinessProblems(cat) {
  return RULES.filter((rule) => !rule.ok(cat)).map(({ key, group, label, detail }) => ({ key, group, label, ...(detail ? { detail: detail(cat) } : {}) }));
}

const GROUP_ORDER = ["Profile", "Medical", "Passport", "Media"];

// The problems grouped in the order above: [{ group, items }], empty groups left out.
export function groupProblems(problems) {
  return GROUP_ORDER.map((group) => ({ group, items: problems.filter((problem) => problem.group === group) })).filter((entry) => entry.items.length > 0);
}

// "Gender, Age (...)" one-liner for messages and the activity log.
export function problemsText(problems) {
  return problems.map((problem) => (problem.detail ? `${problem.label} (${problem.detail})` : problem.label)).join(", ");
}

export const ADOPTION_READY_STATUS = STATUS.ADOPTION_READY;
