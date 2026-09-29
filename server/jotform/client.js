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
