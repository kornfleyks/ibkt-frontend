const MONDAY_API_URL = process.env.MONDAY_API_URL;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;

// Direct Monday GraphQL call with the server's own token, bypassing the
// public /api/monday proxy (so server-side writes are never re-checked or
// re-logged by it). Throws on GraphQL errors.
//
// Older modules (activityLog, caseOwner, userAdmin, accountState) still
// carry their own copy of this; new modules should use this one.
export async function mondayDirectRequest(query, variables = {}) {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: MONDAY_API_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}
