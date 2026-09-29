import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { AI_REVIEW_FIELDS, AI_REVIEW_KINDS, AI_RUN_STATUS } from "../../src/constants/aiReviews.js";
import { HttpError } from "../httpAnswer.js";
import { InputError } from "../database/boardRecords.js";
import { isDatabaseEnabled } from "../database/db.js";
import { listItemFiles } from "../itemFiles.js";
import { mondayDirectRequest } from "../mondayClient.js";
import { logActivity, getItemName } from "../activityLog.js";
import { listTranscripts } from "../screening/transcriptsStore.js";
import { TRANSCRIPT_COLUMNS } from "../screening/routes.js";
import { aiProvider, aiProviderName } from "./provider.js";
import { readApplication, saveReviewFields } from "./applicationFields.js";
import * as runs from "./runsStore.js";

// AI reviews of an application: run one (the provider proposes values for
// the kind's fields), keep it as a draft, and accept it whole or discard
// it. The provider is interchangeable (provider.js); its output is always
// checked here against AI_REVIEW_KINDS / AI_REVIEW_FIELDS.

const BOARD_ID = ACTIVE_APPLICATIONS.BOARD_ID;
const TEXT_MAX_LENGTH = 10_000;

// What a run reads from the application (kept with the run as its input).
const FORM_KEYS = ["name", "whyAdopt", "adoptionMotivation", "previousCatExperience", "householdInformation", "existingPets", "workSchedule", "country", "city", "linkedCatName"];
const CURRENT_KEYS = ["call1Summary", "call1Sentiment", "call2Required", "call2Summary", ...Object.keys(AI_REVIEW_FIELDS).filter((key) => key.startsWith("ai") || key.startsWith("suggested"))];

function requireDatabase() {
  if (!isDatabaseEnabled()) throw new HttpError(503, "AI reviews need the app's database, which isn't set up on this server.");
}

function kindOf(kind) {
  if (!Object.hasOwn(AI_REVIEW_KINDS, kind ?? "")) throw new InputError("Unknown review.");

  return AI_REVIEW_KINDS[kind];
}

function fieldsOf(kind) {
  return kind.fields.map((key) => ({ key, ...AI_REVIEW_FIELDS[key] }));
}

// A file's bytes from Monday (its public URL is short-lived), for providers
// that read uploaded transcripts.
async function assetBytes(assetId) {
  const data = await mondayDirectRequest(`query ($ids: [ID!]!) { assets(ids: $ids) { public_url } }`, { ids: [String(assetId)] });
  const url = data.assets?.[0]?.public_url;

  if (!url) throw new Error(`No download link for file ${assetId}.`);

  const response = await fetch(url);

  if (!response.ok) throw new Error(`Couldn't download file ${assetId} (${response.status}).`);

  return Buffer.from(await response.arrayBuffer());
}

async function transcriptsFor(applicationId, call) {
  const [texts, files] = await Promise.all([
    listTranscripts(applicationId, call),
    listItemFiles({ table: "applications", boardId: BOARD_ID, columnId: TRANSCRIPT_COLUMNS[call] }, applicationId),
  ]);

  return [
    ...texts.map((text) => ({ source: "text", id: text.id, text: text.text, createdAt: text.createdAt })),
    ...files.map((file) => ({ source: "file", assetId: file.assetId, name: file.name, extension: file.extension, readBytes: () => assetBytes(file.assetId) })),
  ];
}

// The provider's output, checked: exactly the kind's fields, each shaped
// as its type says. Anything else is refused (never saved as a draft).
export function checkOutput(kind, output) {
  if (!output || typeof output !== "object") throw new Error("The AI answered in the wrong shape.");

  const checked = {};

  for (const field of fieldsOf(kind)) {
    const value = output[field.key];

    if (field.type === "status") {
      if (!field.options.includes(value)) throw new Error(`The AI's ${field.label} "${value}" isn't one of: ${field.options.join(", ")}.`);
    } else if (field.type === "score") {
      if (!Number.isInteger(value) || value < field.min || value > field.max) throw new Error(`The AI's ${field.label} must be a whole number ${field.min}-${field.max}.`);
    } else if (typeof value !== "string" || !value.trim()) {
      throw new Error(`The AI gave no ${field.label}.`);
    }

    checked[field.key] = typeof value === "string" ? value.trim().slice(0, TEXT_MAX_LENGTH) : value;
  }

  return checked;
}

// Kept with the run for its history: the form and current values, and
// which transcripts were used (a pasted one by id and a short excerpt, so
// deleting it later doesn't leave its full text behind here).
function describeInput(application, transcripts) {
  return {
    application: Object.fromEntries([...FORM_KEYS, ...CURRENT_KEYS].map((key) => [key, application[key] ?? ""])),
    transcripts: transcripts.map(({ readBytes, text, ...entry }) =>
      entry.source === "text" ? { ...entry, characters: text.length, excerpt: text.slice(0, 300) } : entry,
    ),
  };
}

async function log(actor, applicationId, description, raw) {
  const itemName = (await getItemName(applicationId)) || `item ${applicationId}`;

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: BOARD_ID,
    boardName: "Active Applications",
    itemId: applicationId,
    itemName,
    actionType: "Updated",
    description: `${actor.name} ${description} on ${itemName}`,
    fieldChanged: "AI Review",
    raw,
  });
}

export function aiStatus() {
  return { provider: aiProviderName(), available: Boolean(aiProvider()) && isDatabaseEnabled(), mock: aiProviderName() === "mock" };
}

// { draft | null, runs: [...] } - the open draft with its input.
export async function reviewState(applicationId) {
  if (!isDatabaseEnabled()) return { ...aiStatus(), draft: null, runs: [] };

  const list = await runs.listRuns(BOARD_ID, applicationId);
  const open = list.find((run) => run.status === AI_RUN_STATUS.DRAFT);

  return { ...aiStatus(), draft: open ? await runs.getRun(BOARD_ID, applicationId, open.id) : null, runs: list };
}

export async function startReview({ applicationId, kindKey, actor, uploader }) {
  requireDatabase();

  const kind = kindOf(kindKey);
  const provider = aiProvider();

  if (!provider) throw new HttpError(503, `The AI provider "${aiProviderName()}" isn't set up on this server.`);

  const application = await readApplication(applicationId);

  if (!application) throw new HttpError(404, "Application not found.");

  const transcripts = kind.call ? await transcriptsFor(applicationId, kind.call) : [];

  if (kind.call && !transcripts.length) throw new InputError(`Add the Call ${kind.call} transcript first (upload a file or paste the text).`);

  let result;

  try {
    result = await provider.review({ kind: kindKey, fields: fieldsOf(kind), inputs: { application, transcripts } });
  } catch (err) {
    console.error("AI review: the provider failed.", err);
    throw new HttpError(502, `The AI couldn't do the ${kind.label.toLowerCase()}. Try again in a moment.`);
  }

  let output;

  try {
    output = checkOutput(kind, result.output);
  } catch (err) {
    console.error("AI review: unusable answer.", err.message);
    throw new HttpError(502, `The AI's answer couldn't be used (${err.message}). Try again.`);
  }

  const run = await runs.createDraft({
    boardId: BOARD_ID,
    applicationId,
    kind: kindKey,
    provider: provider.name,
    model: result.model,
    input: describeInput(application, transcripts),
    output,
    by: uploader,
  });

  log(actor, applicationId, `ran the AI ${kind.label.toLowerCase()} (draft)`, { runId: run.id, kind: kindKey, provider: provider.name });

  return run;
}

// Saves the whole draft into the application. Answers { run, values }.
export async function acceptReview({ applicationId, runId, actor }) {
  requireDatabase();

  const run = await runs.getRun(BOARD_ID, applicationId, runId);

  if (!run) throw new HttpError(404, "That AI review isn't on this application.");
  if (run.status !== AI_RUN_STATUS.DRAFT) throw new HttpError(409, `That AI review is already ${run.status}.`);

  // Checked again: the output may predate a change to the field rules.
  const values = checkOutput(kindOf(run.kind), run.output);
  const decided = await runs.decide({ boardId: BOARD_ID, applicationId, runId, status: AI_RUN_STATUS.ACCEPTED, by: actor });

  if (!decided) throw new HttpError(409, "That AI review was just decided by someone else.");

  let saved;

  try {
    saved = await saveReviewFields(actor, applicationId, values);
  } catch (err) {
    // Put the draft back so it can be accepted again once the save works.
    await runs.reopen(runId).catch((reopenErr) => console.error("AI review: couldn't reopen the draft.", reopenErr.message));
    throw err;
  }

  log(actor, applicationId, `accepted the AI ${AI_REVIEW_KINDS[run.kind].label.toLowerCase()}`, { runId, kind: run.kind });

  return { run: decided, values: saved ?? values };
}

export async function discardReview({ applicationId, runId, actor }) {
  requireDatabase();

  const run = await runs.decide({ boardId: BOARD_ID, applicationId, runId, status: AI_RUN_STATUS.DISCARDED, by: actor });

  if (!run) throw new HttpError(409, "That AI review isn't an open draft any more.");

  log(actor, applicationId, `discarded the AI ${AI_REVIEW_KINDS[run.kind].label.toLowerCase()}`, { runId, kind: run.kind });

  return { run };
}

export async function getReview(applicationId, runId) {
  requireDatabase();

  const run = await runs.getRun(BOARD_ID, applicationId, runId);

  if (!run) throw new HttpError(404, "That AI review isn't on this application.");

  return { run };
}
