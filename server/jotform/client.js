// Read-only access to the client's Jotform account (US region, so
// api.jotform.com). JOTFORM_API_KEY only needs "Read Access".

const API_URL = process.env.JOTFORM_API_URL || "https://api.jotform.com";
const API_KEY = process.env.JOTFORM_API_KEY;

export function isJotformEnabled() {
  return Boolean(API_KEY);
}

// One submission as Jotform keeps it: { id, form_id, created_at,
// updated_at, status, answers: { qid: { name, type, text, answer } } }.
// Answers null for a submission this account doesn't have: Jotform says
// 401 for those (the same answer as for a wrong key) and 404 for an id
// that isn't a number.
export async function getSubmission(submissionId) {
  const res = await fetch(`${API_URL}/submission/${encodeURIComponent(submissionId)}`, {
    headers: { APIKEY: API_KEY },
  });
  const body = await res.json().catch(() => null);
  const code = body?.responseCode ?? res.status;

  if (code === 200 && body?.content) {
    return body.content;
  }

  if (code === 401 || code === 404) {
    return null;
  }

  throw new Error(`Jotform answered ${code}: ${body?.message ?? res.statusText}`);
}

// Every submission of a form created after `since` ("YYYY-MM-DD HH:MM:SS",
// Jotform's account time), oldest first, deleted ones left out. 1 API call
// per 1,000 submissions (the import of older submissions).
export async function listFormSubmissions(formId, { since }) {
  const filter = encodeURIComponent(JSON.stringify({ "created_at:gt": since }));
  const all = [];

  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${API_URL}/form/${encodeURIComponent(formId)}/submissions?limit=1000&offset=${offset}&filter=${filter}`, {
      headers: { APIKEY: API_KEY },
    });
    const body = await res.json().catch(() => null);

    if ((body?.responseCode ?? res.status) !== 200) throw new Error(`Jotform answered ${body?.responseCode ?? res.status}: ${body?.message ?? res.statusText}`);

    all.push(...body.content);

    if (body.content.length < 1000) break;
  }

  return all.filter((submission) => submission.status !== "DELETED").sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// A form's submissions created or edited after `since` ("YYYY-MM-DD
// HH:MM:SS", Jotform's account time), deleted ones left out, each once.
// 2 API calls (the safety-net check, jotform/poll.js).
export async function listChangedSubmissions(formId, { since }) {
  const byFilter = async (key) => {
    const filter = encodeURIComponent(JSON.stringify({ [key]: since }));
    const res = await fetch(`${API_URL}/form/${encodeURIComponent(formId)}/submissions?limit=1000&filter=${filter}`, { headers: { APIKEY: API_KEY } });
    const body = await res.json().catch(() => null);

    if ((body?.responseCode ?? res.status) !== 200) throw new Error(`Jotform answered ${body?.responseCode ?? res.status}: ${body?.message ?? res.statusText}`);

    return body.content;
  };
  const both = [...(await byFilter("created_at:gt")), ...(await byFilter("updated_at:gt"))];

  return [...new Map(both.filter((submission) => submission.status !== "DELETED").map((submission) => [String(submission.id), submission])).values()].sort((a, b) =>
    String(a.updated_at ?? a.created_at).localeCompare(String(b.updated_at ?? b.created_at)),
  );
}
