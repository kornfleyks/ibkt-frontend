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

// `portal: "rescuer"` from the rescuer sign-in page: the server only lets a
// rescuer in there, and only lets non-rescuers in on the main page.
export function login(email, password, portal) {
  return postJson("/api/login", { email, password, ...(portal ? { portal } : {}) });
}

export function register({ firstName, lastName, email, password, inviteCode }) {
  return postJson("/api/register", { firstName, lastName, email, password, inviteCode });
}

export function requestPasswordReset(email) {
  return postJson("/api/password-reset/request", { email });
}

export function confirmPasswordReset(code, newPassword) {
  return postJson("/api/password-reset/confirm", { code, newPassword });
}
