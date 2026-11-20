import { CATS_STATUS_OPTIONS } from "../../src/constants/statuses/catsStatuses.js";

// What a foster's Kitty Profile (constants/forms/fosterProfileForm.js) proposes for
// the cat's own fields (docs/foster-onboarding.md, phase 5). The answers do not
// map one to one onto the cat's fields, so these are only proposals: staff see
// them next to the current values, can change or leave out any of them, and
// press Apply. Pure functions, no storage.
//
// Monday keeps at most 2000 characters of a long text column and silently drops
// the rest, so a text that does not fit is flagged (`tooLong`) and Apply refuses it.

export const LONG_TEXT_LIMIT = 2000;

const O = CATS_STATUS_OPTIONS;

// The cat fields a profile may change, with how each is edited. `unanswered`
// are the current values that mean nobody has answered yet (so the proposal is
// ticked by default).
export const APPLY_FIELDS = {
  personalitySummary: { label: "Personality summary", kind: "text", unanswered: [""] },
  specialNotes: { label: "Special notes", kind: "text", append: true, unanswered: [""] },
  medicalSummary: { label: "Medical summary", kind: "text", append: true, unanswered: [""] },
  childFriendly: { label: "Child friendly", kind: "select", options: Object.values(O.CHILD_FRIENDLY), unanswered: ["", "N/A", "Unknown"] },
  catFriendly: { label: "Cat friendly", kind: "select", options: Object.values(O.CAT_FRIENDLY), unanswered: ["", "N/A", "Unknown"] },
  dogFriendly: { label: "Dog friendly", kind: "select", options: Object.values(O.DOG_FRIENDLY), unanswered: ["", "N/A", "Unknown"] },
  lapCat: { label: "Lap cat", kind: "select", options: Object.values(O.LAP_CAT), unanswered: ["", "N/A", "Unknown"] },
  energyLevel: { label: "Energy level", kind: "select", options: Object.values(O.ENERGY_LEVEL), unanswered: ["", "N/A"] },
  indoorOnly: { label: "Indoor only", kind: "select", options: Object.values(O.INDOOR_ONLY), unanswered: ["", "N/A"] },
  vaccinated: { label: "Vaccinated", kind: "select", options: Object.values(O.VACCINATED), unanswered: ["", "N/A", "No"] },
  sterilized: { label: "Sterilised", kind: "select", options: Object.values(O.NEUTERED), unanswered: ["", "N/A", "No"] },
  felvStatus: { label: "FeLV status", kind: "select", options: Object.values(O.FELV_STATUS), unanswered: ["", "N/A", "Not Tested Yet", "Pending"] },
  fivStatus: { label: "FIV status", kind: "select", options: Object.values(O.FIV_STATUS), unanswered: ["", "N/A", "Not Tested Yet", "Pending"] },
  medicationRequired: { label: "Medication required", kind: "select", options: Object.values(O.MEDICATION_REQUIRED), unanswered: ["", "N/A", "No"] },
};

export const APPLY_KEYS = Object.keys(APPLY_FIELDS);

const BEHAVIOUR_NO = ["Aggressive", "Fearful", "Absolutely No"];
const BEHAVIOUR_YES = ["Friendly", "Essential"];
const BEHAVIOUR_SOMETIMES = ["Cautious", "Submissive", "Tolerates"];

// How a cat acts around children, cats or dogs (the options ticked): anything
// worrying counts first, then friendly, then cautious or tolerant; nothing but
// "I don't know" proposes nothing.
export function friendliness(selected) {
  const picked = Array.isArray(selected) ? selected : [];

  if (picked.some((option) => BEHAVIOUR_NO.includes(option))) return O.CHILD_FRIENDLY.NO;
  if (picked.some((option) => BEHAVIOUR_YES.includes(option))) return O.CHILD_FRIENDLY.YES;
  if (picked.some((option) => BEHAVIOUR_SOMETIMES.includes(option))) return O.CHILD_FRIENDLY.SOMETIMES;

  return null;
}

const LAP_CAT = { "Yes, often": O.LAP_CAT.YES, "Yes, sometimes": O.LAP_CAT.SOMETIMES, Rarely: O.LAP_CAT.SOMETIMES, Never: O.LAP_CAT.NO };
const ENERGY = { Gentle: O.ENERGY_LEVEL.MEDIUM, "Somewhat rough": O.ENERGY_LEVEL.HIGH, "Very rough": O.ENERGY_LEVEL.HIGH, "Does not play": O.ENERGY_LEVEL.LOW };

const list = (value) => (Array.isArray(value) ? value : []);
const text = (value) => String(value ?? "").trim();
const clip = (value, max) => (text(value).length > max ? `${text(value).slice(0, max - 3)}...` : text(value));

function dayOf(date) {
  const parsed = date ? new Date(date) : null;

  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : "";
}

// The lines under a heading with the date the profile was sent; nothing at all
// when there are no lines, so an empty profile proposes nothing.
function withHeading(lines, submittedAt) {
  if (lines.length === 0) return "";

  return [`Foster profile${dayOf(submittedAt) ? ` (${dayOf(submittedAt)})` : ""}:`, ...lines].join("\n");
}

// The Special Notes block: the profile's answers that have no field of their
// own, short enough to share the 2000 characters with what is already there.
export function specialNotesBlock(answers, submittedAt) {
  const a = answers ?? {};
  const animals = a.otherAnimals === "Yes" ? [list(a.animalTypes).includes("Cats") && `cats (${a.otherCats ?? "?"})`, list(a.animalTypes).includes("Dogs") && `dogs (${a.otherDogs ?? "?"})`].filter(Boolean).join(", ") : "none";
  const behaviour = [
    ["Children", a.behaviourChildren],
    ["Strangers", a.behaviourStrangers],
    ["Other cats", a.behaviourCats],
    ["Dogs", a.behaviourDogs],
    ["Indoors", a.behaviourIndoors],
    ["Outdoors", a.behaviourOutdoors],
    ["Loud noises", a.behaviourNoise],
  ]
    .filter(([, value]) => list(value).length)
    .map(([label, value]) => `${label}: ${list(value).join("/")}`)
    .join("; ");
  const bites = a.hasBitten === "Yes" ? `Has bitten${a.biteBrokeSkin === "Yes" ? " (broke skin)" : ""}: ${clip(a.biteDetails, 250)}` : a.hasBitten === "No" ? "Has not bitten" : "";
  const lines = [
    a.household || a.howLong ? `Household: ${[a.household, a.howLong && `with the foster for ${clip(a.howLong, 80)}`].filter(Boolean).join(", ")}. Other animals: ${animals}.` : "",
    behaviour && `Behaviour - ${behaviour}.`,
    list(a.personality).length && `Personality: ${list(a.personality).join(", ")}.`,
    a.bestQuality && `Best quality: ${clip(a.bestQuality, 120)}.`,
    a.worstQuality && `Worst quality: ${clip(a.worstQuality, 120)}.`,
    bites && `${bites}.`,
    [
      a.livesWhere && `Lives: ${a.livesWhere}`,
      a.likesHeld && `likes to be held: ${a.likesHeld}`,
      a.likesPickedUp && `picked up: ${a.likesPickedUp}`,
      a.play && `play: ${a.play}`,
    ]
      .filter(Boolean)
      .join("; ") + ".",
    a.usesLitter &&
      `Litter: always uses it: ${a.usesLitter}; ${[a.litterType, a.litterBoxes && `${a.litterBoxes} box(es)`, a.litterBoxType, a.litterLocation && `in ${clip(a.litterLocation, 60)}`].filter(Boolean).join(", ")}.`,
    list(a.foodTypes).length && `Food: ${list(a.foodTypes).join("/")}. ${clip(a.feedingDetails, 200)}`,
    a.otherInfo && `Other: ${clip(a.otherInfo, 250)}`,
    a.idealFamily && `Ideal family: ${clip(a.idealFamily, 200)}`,
  ];

  return withHeading(lines.filter((line) => line && line !== "."), submittedAt);
}

// The Medical Summary block: conditions, medication and the health ticks.
export function medicalBlock(answers, submittedAt) {
  const a = answers ?? {};
  const lines = [
    a.medicalConditions && `Conditions: ${clip(a.medicalConditions, 400)}`,
    a.onMedication === "Yes" ? `Medication or special diet: ${clip(a.medicationDetails, 300)}` : a.onMedication === "No" ? "No medication or special diet." : "",
    list(a.healthChecks).length && `Ticked by the foster: ${list(a.healthChecks).join(", ")}.`,
  ];

  return withHeading(lines.filter(Boolean), submittedAt);
}

// The proposal: [{ key, label, kind, options?, current, proposed, defaultApply,
// tooLong }] for every cat field the answers say something about. `cat` is the
// cat as the cats routes answer it. A text that is appended (special notes,
// medical summary) keeps what is there and adds the block after a blank line.
export function proposeFields(answers, cat, submittedAt) {
  const a = answers ?? {};
  const proposals = {
    personalitySummary: text(a.profile) || null,
    specialNotes: specialNotesBlock(a, submittedAt) || null,
    medicalSummary: medicalBlock(a, submittedAt) || null,
    childFriendly: friendliness(a.behaviourChildren),
    catFriendly: friendliness(a.behaviourCats),
    dogFriendly: friendliness(a.behaviourDogs),
    lapCat: LAP_CAT[a.lapCat] ?? null,
    energyLevel: ENERGY[a.play] ?? null,
    indoorOnly: a.livesWhere ? (a.livesWhere === "Indoor only" ? O.INDOOR_ONLY.YES : O.INDOOR_ONLY.NO) : null,
    vaccinated: list(a.healthChecks).some((option) => ["Rabies Vaccinated", "PCH Booster"].includes(option)) ? O.VACCINATED.YES : null,
    sterilized: a.spayedNeutered === "Yes" ? O.NEUTERED.YES : a.spayedNeutered === "No" ? O.NEUTERED.NO : null,
    felvStatus: list(a.healthChecks).includes("FeLV+") ? O.FELV_STATUS.POSITIVE : list(a.healthChecks).includes("FELV Negative") ? O.FELV_STATUS.NEGATIVE : null,
    fivStatus: list(a.healthChecks).includes("FIV+") ? O.FIV_STATUS.POSITIVE : list(a.healthChecks).includes("FIV Negative") ? O.FIV_STATUS.NEGATIVE : null,
    medicationRequired: a.onMedication === "Yes" ? O.MEDICATION_REQUIRED.YES : a.onMedication === "No" ? O.MEDICATION_REQUIRED.NO : null,
  };

  const out = [];

  for (const key of APPLY_KEYS) {
    const spec = APPLY_FIELDS[key];
    const proposal = proposals[key];

    if (proposal === null || proposal === undefined || proposal === "") continue;

    const current = text(cat?.[key]);
    const proposed = spec.append && current ? `${current}\n\n${proposal}` : proposal;
    const unanswered = spec.unanswered.includes(current);

    out.push({
      key,
      label: spec.label,
      kind: spec.kind,
      options: spec.options,
      current: cat?.[key] ?? "",
      proposed,
      // Ticked when nobody has answered yet, and for the two appended texts
      // (nothing is lost) as long as they fit.
      defaultApply: (unanswered || Boolean(spec.append)) && proposed !== current && proposed.length <= LONG_TEXT_LIMIT,
      tooLong: spec.kind === "text" && proposed.length > LONG_TEXT_LIMIT,
    });
  }

  return out;
}
