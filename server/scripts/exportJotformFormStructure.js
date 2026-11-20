// Downloads the structure of Jotform forms (questions, options, required
// flags, page breaks and show/hide conditions) into JSON files, so a form can
// be copied into the app exactly. Read-only, and it never fetches
// submissions, so no applicant data is involved. The API key comes from
// JOTFORM_API_KEY in server/.env and is never printed.
//
//   node scripts/exportJotformFormStructure.js <outputDir> <formId> [<formId> ...]
//
// Writes <outputDir>/<formId>.questions.json and <formId>.conditions.json.
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const API_URL = process.env.JOTFORM_API_URL || "https://api.jotform.com";
const API_KEY = process.env.JOTFORM_API_KEY;
const [outputArg, ...formIds] = process.argv.slice(2);

if (!API_KEY) {
  console.error("JOTFORM_API_KEY is not set in server/.env.");
  process.exit(1);
}

if (!outputArg || formIds.length === 0) {
  console.error("Usage: node scripts/exportJotformFormStructure.js <outputDir> <formId> [<formId> ...]");
  process.exit(1);
}

const outputDir = resolve(outputArg);
mkdirSync(outputDir, { recursive: true });

async function get(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: { APIKEY: API_KEY } });
  const body = await res.json().catch(() => null);
  const code = body?.responseCode ?? res.status;

  if (code !== 200) throw new Error(`Jotform answered ${code} for ${path}: ${body?.message ?? res.statusText}`);

  return body.content;
}

for (const formId of formIds) {
  const questions = Object.values(await get(`/form/${encodeURIComponent(formId)}/questions`)).sort((a, b) => Number(a.order) - Number(b.order));
  const properties = await get(`/form/${encodeURIComponent(formId)}/properties`);

  writeFileSync(join(outputDir, `${formId}.questions.json`), JSON.stringify(questions, null, 1));
  writeFileSync(join(outputDir, `${formId}.conditions.json`), JSON.stringify(properties.conditions ?? [], null, 1));
  console.log(`${formId}: ${questions.length} questions, ${(properties.conditions ?? []).length} conditions.`);
}
