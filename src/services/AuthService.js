// Login/registration talk to the server directly rather than through the
// generic /api/monday proxy - they're the one thing that has to work
// before a session token exists to authenticate that proxy with.
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

async function postJson(path, body) {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Request failed.");
  }

  return result;
}

export function login(email, password) {
  return postJson("/api/login", { email, password });
}

export function register({ firstName, lastName, email, password, inviteCode }) {
  return postJson("/api/register", { firstName, lastName, email, password, inviteCode });
}
