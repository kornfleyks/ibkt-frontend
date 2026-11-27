import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage } from "../aiUsage/store.js";

// The in-app assistant: a chat where staff ask how Oriel works. It answers
// from the guide in ./guide and the instructions in ./instructions.md. It sees
// no data of Oriel: the only things sent to Claude are the staff member's
// questions, the guide, and their role. Nothing is stored.
//
// Settings in the server's environment:
//   ASSISTANT_ENABLED             "true" to switch the assistant on (off by default)
//   ASSISTANT_MODEL               the Claude model (default claude-sonnet-5-5)
//   ASSISTANT_MAX_PER_DAY         the most answers a day for everyone, UTC (default 300)
//   ASSISTANT_MAX_PER_USER_HOUR   the most answers an hour for one person (default 30)
//   ANTHROPIC_API_KEY, ANTHROPIC_WORKSPACE_ID  the Claude account

const DIR = path.dirname(fileURLToPath(import.meta.url));
const INSTRUCTIONS_FILE = path.join(DIR, "instructions.md");
const GUIDE_DIR = path.join(DIR, "guide");

const DEFAULT_MODEL = "claude-sonnet-5-5";
const DEFAULT_MAX_PER_DAY = 300;
const DEFAULT_MAX_PER_USER_HOUR = 30;
const MAX_TOKENS = 4000;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const HOUR_MS = 60 * 60 * 1000;

export class AssistantError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);

  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function assistantSettings() {
  return {
    enabled: process.env.ASSISTANT_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY),
    model: process.env.ASSISTANT_MODEL?.trim() || DEFAULT_MODEL,
    maxPerDay: positiveInteger(process.env.ASSISTANT_MAX_PER_DAY, DEFAULT_MAX_PER_DAY),
    maxPerUserHour: positiveInteger(process.env.ASSISTANT_MAX_PER_USER_HOUR, DEFAULT_MAX_PER_USER_HOUR),
  };
}

// The limits are kept in memory. They guard the cost, and starting the server
// again resets them. The real usage is counted in the database (aiUsage).
const today = { day: "", count: 0 };
const perUser = new Map();

function checkLimits(userId, settings, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);

  if (today.day !== day) {
    today.day = day;
    today.count = 0;
  }

  if (today.count >= settings.maxPerDay) throw new AssistantError(429, "Quinnie has reached the limit for today. Try again tomorrow.");

  const recent = (perUser.get(userId) ?? []).filter((time) => now - time < HOUR_MS);

  if (recent.length >= settings.maxPerUserHour) throw new AssistantError(429, "You have asked a lot of questions in the last hour. Please try again a little later.");

  recent.push(now);
  perUser.set(userId, recent);
  today.count += 1;
}

// The guide: every .md file of the guide folder, in file name order.
function readGuide() {
  if (!fs.existsSync(GUIDE_DIR)) return "";

  return fs
    .readdirSync(GUIDE_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => fs.readFileSync(path.join(GUIDE_DIR, name), "utf8").trim())
    .join("\n\n");
}

// Checks the conversation the browser sent and keeps the last messages.
export function cleanConversation(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new AssistantError(400, "Write a question first.");

  const cleaned = messages.slice(-MAX_MESSAGES).map((message) => {
    const role = message?.role;
    const content = typeof message?.content === "string" ? message.content.trim() : "";

    if ((role !== "user" && role !== "assistant") || !content) throw new AssistantError(400, "The conversation is not valid.");
    if (content.length > MAX_MESSAGE_LENGTH) throw new AssistantError(400, `A message is too long (the limit is ${MAX_MESSAGE_LENGTH} characters).`);

    return { role, content };
  });

  // The conversation must start and end with the person's message.
  while (cleaned.length && cleaned[0].role !== "user") cleaned.shift();

  if (!cleaned.length || cleaned[cleaned.length - 1].role !== "user") throw new AssistantError(400, "The conversation is not valid.");

  return cleaned;
}

function client() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    ...(process.env.ANTHROPIC_WORKSPACE_ID ? { defaultHeaders: { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID } } : {}),
  });
}

// Answers the conversation of one staff member: { id, role } and the messages.
export async function answerQuestion({ user, messages }) {
  const settings = assistantSettings();

  if (!settings.enabled) throw new AssistantError(503, "Quinnie is not switched on on this server.");

  const conversation = cleanConversation(messages);

  checkLimits(String(user.id), settings);

  // The guide comes first and is marked for caching, so that the following
  // questions of everyone reuse it at a much lower price.
  const system = [
    { type: "text", text: `${fs.readFileSync(INSTRUCTIONS_FILE, "utf8").trim()}\n\n# Guide\n\n${readGuide()}`, cache_control: { type: "ephemeral" } },
    { type: "text", text: `The person asking has the role ${user.role}.` },
  ];

  let response;

  try {
    response = await client().messages.create({
      model: settings.model,
      max_tokens: MAX_TOKENS,
      system,
      output_config: { effort: "low" },
      messages: conversation,
    });
  } catch (err) {
    console.error("Assistant: Claude failed.", err.message);
    await recordAiUsage({ provider: "anthropic", model: settings.model, ok: false, error: err.message });
    throw new AssistantError(502, "Quinnie could not answer. Try again in a moment.");
  }

  await recordAiUsage({ provider: "anthropic", model: response.model ?? settings.model, usage: response.usage });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !text) {
    throw new AssistantError(502, "Quinnie could not answer that. Try asking in a different way.");
  }

  return text;
}
