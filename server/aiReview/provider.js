import * as mockProvider from "./mockProvider.js";

// The AI behind the application reviews. Chosen by AI_PROVIDER in the
// server's environment; "mock" (the default, and the only one so far) makes
// clearly marked sample text from the inputs and calls no AI service.
//
// A provider module exports:
//   name                     e.g. "mock"
//   review({ kind, fields, inputs }) -> { model, output, usage? }
// where `usage` (optional) is the usage object of the AI's response
// (input_tokens, output_tokens, cache_read_input_tokens,
// cache_creation_input_tokens), counted on the App Settings usage card
// (aiUsage/). A provider that calls no AI service leaves it out.
// where `fields` are AI_REVIEW_FIELDS entries ({ key, label, type, options?,
// min?, max? }) the output must contain exactly, and `inputs` is:
//   { application: { form answers, current AI values, ... },
//     transcripts: [{ source: "text", text, createdAt } |
//                   { source: "file", name, extension, readBytes() }] }
// The caller checks the output (reviews.js), whatever the provider.
// Adding a real provider: a module with the same exports, one entry below,
// and its API key in the environment.

const PROVIDERS = {
  mock: mockProvider,
};

export function aiProvider() {
  const name = (process.env.AI_PROVIDER || "mock").trim().toLowerCase();

  return PROVIDERS[name] ?? null;
}

export function aiProviderName() {
  return (process.env.AI_PROVIDER || "mock").trim().toLowerCase();
}
