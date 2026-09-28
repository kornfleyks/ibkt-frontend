// The session token's own sign-in and expiry times, read locally (no
// server call). Display only - the server verifies the token; nothing here
// is trusted for access decisions. Nulls if the token can't be read.
export function readSessionTimes(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { iat, exp } = JSON.parse(atob(payload));

    return {
      signedInAt: iat ? new Date(iat * 1000) : null,
      expiresAt: exp ? new Date(exp * 1000) : null,
    };
  } catch {
    return { signedInAt: null, expiresAt: null };
  }
}
