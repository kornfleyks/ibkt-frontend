import crypto from "node:crypto";

// A short fingerprint of an account's password hash, carried in every
// session token (the `pwd` claim) and kept in the live account state. When
// the password changes the fingerprint changes, so requireAuth rejects
// every session made with the old password - "sign out everywhere" without
// storing sessions. Keyed with JWT_SECRET: the token (readable by its
// holder) then says nothing about the hash itself.

export function passwordStampOf(passwordHash) {
  if (!passwordHash) {
    return "";
  }

  return crypto.createHmac("sha256", process.env.JWT_SECRET ?? "").update(passwordHash).digest("hex").slice(0, 16);
}
