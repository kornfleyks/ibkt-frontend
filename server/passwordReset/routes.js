import { USERS } from "../../src/constants/boards/users.js";
import { findUserByEmail, findUserByResetToken, setUserColumns, hashPassword } from "../auth.js";
import { clearAttempts } from "../loginLockout.js";
import { logActivity } from "../activityLog.js";
import { createResetCode, isUnexpired, codeMatches } from "./tokens.js";
import { isSenderConfigured, sendResetCode } from "./sender.js";

// "Forgot password?" on the login page. Public routes: the caller has no
// session. The request never says whether the email has an account, and
// the work behind it happens after the answer is sent, so its timing
// doesn't tell either.

const COLUMNS = USERS.COLUMNS;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const INVALID_LINK = "This reset link is invalid or has expired. Request a new one.";

function fullNameOf(user) {
  return `${user.firstName} ${user.lastName}`.trim();
}

// Monday's date-with-time format, in UTC like Last Login.
function expiryValue(epochMs) {
  const iso = new Date(epochMs).toISOString();

  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}

const CLEARED_TOKEN = {
  [COLUMNS.PASSWORD_RESET_TOKEN]: "",
  [COLUMNS.PASSWORD_RESET_EXPIRY]: {},
};

// Only Active accounts, and only once the previous code has expired (one
// email per 15 minutes per account, which also caps how many of the
// client's Jotform submissions a stranger can spend on one address).
async function sendResetEmail(email) {
  const user = await findUserByEmail(email);

  if (!user || user.accountStatus !== "Active" || isUnexpired(user.passwordResetToken)) {
    return;
  }

  const { code, stored, expiresAt } = createResetCode();

  await setUserColumns(user.id, {
    [COLUMNS.PASSWORD_RESET_TOKEN]: stored,
    [COLUMNS.PASSWORD_RESET_EXPIRY]: expiryValue(expiresAt),
  });

  try {
    await sendResetCode({ email: user.email, code });
  } catch (err) {
    // Otherwise the unsent code would block a retry until it expired.
    await setUserColumns(user.id, CLEARED_TOKEN).catch((clearErr) =>
      console.error("Password reset: couldn't clear an unsent code.", clearErr.message),
    );
    throw err;
  }
}

export function registerPasswordResetRoutes(app) {
  app.post("/api/password-reset/request", (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (!isSenderConfigured()) {
      return res.status(503).json({ error: "Password reset isn't set up on this server yet. Ask an Admin to reset your password." });
    }

    res.json({ ok: true });

    sendResetEmail(email).catch((err) => console.error("Password reset: request failed.", err.message));
  });

  app.post("/api/password-reset/confirm", async (req, res) => {
    const { code, newPassword } = req.body ?? {};

    if (typeof code !== "string" || !code) {
      return res.status(400).json({ error: INVALID_LINK });
    }

    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    try {
      const user = await findUserByResetToken((stored) => codeMatches(stored, code));

      if (!user || user.accountStatus !== "Active") {
        return res.status(400).json({ error: INVALID_LINK });
      }

      // One write: the new password and the used code's removal together.
      await setUserColumns(user.id, {
        [COLUMNS.PASSWORD_HASH]: await hashPassword(newPassword),
        ...CLEARED_TOKEN,
      });

      clearAttempts(user.email);

      const fullName = fullNameOf(user);

      logActivity({
        actorId: user.id,
        actorName: fullName,
        boardId: USERS.BOARD_ID,
        boardName: "Users",
        itemId: user.id,
        itemName: fullName,
        actionType: "Password Reset",
        description: `${fullName} reset their password with a reset link`,
      });

      res.json({ ok: true });
    } catch (err) {
      if (err?.rateLimited) {
        res.set("Retry-After", String(err.retryAfterSeconds));
        return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
      }

      console.error(err);
      res.status(500).json({ error: "Failed to reset your password." });
    }
  });
}
