import { USERS } from "../src/constants/boards/users.js";
import { USERS_STATUS_OPTIONS } from "../src/constants/statuses/usersStatuses.js";
import { sanitizePreferences } from "../src/constants/preferences.js";
import { dialCodeOf } from "../src/constants/countries.js";
import {
  getAccountRow,
  setUserColumns,
  setUserPasswordHash,
  findUserByEmail,
  hashPassword,
  comparePassword,
  signToken,
} from "./auth.js";
import { applyAccountChange } from "./accountState.js";
import { checkLockout, recordFailedAttempt, clearAttempts, lockoutMessage } from "./loginLockout.js";
import { clearCache } from "./mondayCache.js";
import { logActivity } from "./activityLog.js";

// Self-service account endpoints behind the Account page (Profile and
// Settings tabs). Every route acts on the caller's own row only - the id
// always comes from the verified token (req.user.sub), never the request -
// which is why these can bypass the proxy's "Users board mutations are
// Admin-only" rule safely.

const COLUMNS = USERS.COLUMNS;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
// E.164 allows at most 15 digits including the country code.
const MAX_PHONE_DIGITS = 15;

// Never 401 for a wrong current password: the frontend treats any 401 as an
// expired session and signs the user out.
const WRONG_PASSWORD = { status: 400, error: "Your current password is incorrect." };

function fullNameOf(user) {
  return `${user.firstName} ${user.lastName}`.trim();
}

// The session-safe user shape the frontend stores (same as /api/login's).
function sessionUserOf(row) {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    role: row.role,
  };
}

function lastLoginIso(rawValue) {
  try {
    const { date, time } = JSON.parse(rawValue || "{}");

    return date ? new Date(`${date}T${time || "00:00:00"}Z`).toISOString() : null;
  } catch {
    return null;
  }
}

function accountViewOf(row) {
  return {
    ...sessionUserOf(row),
    phone: row.phone,
    accountStatus: row.accountStatus,
    emailVerified: row.emailVerified,
    lastLogin: lastLoginIso(row.lastLoginRaw),
    preferences: row.preferences,
  };
}

function logOwnChange(req, row, actionType, description) {
  const actorName = fullNameOf(row);

  logActivity({
    actorId: req.user.sub,
    actorName,
    boardId: USERS.BOARD_ID,
    boardName: "Users",
    itemId: req.user.sub,
    itemName: actorName,
    actionType,
    description: `${actorName} ${description}`,
  });
}

// { phone, countryShortName } for Monday, or { error }. An empty number
// clears the column.
function toPhoneValue(phone) {
  const number = String(phone?.number ?? "").replace(/[\s\-().]/g, "");

  if (!number) {
    return { value: { phone: "", countryShortName: "" } };
  }

  const dialCode = dialCodeOf(phone?.country);

  if (!dialCode) {
    return { error: "Choose the phone number's country." };
  }

  if (!/^\d+$/.test(number) || dialCode.length + number.length > MAX_PHONE_DIGITS || number.length < 4) {
    return { error: "Enter a valid phone number (digits only, without the country code)." };
  }

  return { value: { phone: `+${dialCode}${number}`, countryShortName: phone.country } };
}

function cleanName(name) {
  return typeof name === "string" ? name.trim() : "";
}

// Current-password check shared by the email and password changes, with
// the same per-account lockout as /api/login. Null when it passed,
// otherwise { status, error } to send.
async function verifyCurrentPassword(row, currentPassword) {
  const lockedMinutes = await checkLockout(row.email);

  if (lockedMinutes !== null) {
    return { status: 429, error: lockoutMessage(lockedMinutes) };
  }

  const matches = currentPassword && row.passwordHash && (await comparePassword(currentPassword, row.passwordHash));

  if (!matches) {
    await recordFailedAttempt(row.email);
    return WRONG_PASSWORD;
  }

  clearAttempts(row.email);
  return null;
}

function sendFailure(res, err, message) {
  if (err?.rateLimited) {
    res.set("Retry-After", String(err.retryAfterSeconds));
    return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
  }

  console.error(err);
  return res.status(500).json({ error: message });
}

export function registerAccountRoutes(app, { requireAuth }) {
  app.get("/api/account", requireAuth, async (req, res) => {
    try {
      const row = await getAccountRow(req.user.sub);

      if (!row) {
        return res.status(404).json({ error: "Account not found." });
      }

      res.json({ account: accountViewOf(row) });
    } catch (err) {
      sendFailure(res, err, "Failed to load your account.");
    }
  });

  app.post("/api/account/profile", requireAuth, async (req, res) => {
    const firstName = cleanName(req.body?.firstName);
    const lastName = cleanName(req.body?.lastName);

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "First and last name are required." });
    }

    if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Names can be at most ${MAX_NAME_LENGTH} characters.` });
    }

    const phone = toPhoneValue(req.body?.phone);

    if (phone.error) {
      return res.status(400).json({ error: phone.error });
    }

    try {
      await setUserColumns(req.user.sub, {
        [COLUMNS.FIRST_NAME]: firstName,
        [COLUMNS.LAST_NAME]: lastName,
        [COLUMNS.PHONE]: phone.value,
      });

      // Mentions, notification recipients and profile cards read from memory.
      applyAccountChange(req.user.sub, {
        firstName,
        lastName,
        phone: { number: phone.value.phone, country: phone.value.countryShortName },
      });
      clearCache([USERS.BOARD_ID]);

      // Built from what was just written rather than read back - one Monday
      // call fewer against the daily limit.
      const user = { id: req.user.sub, firstName, lastName, email: req.user.email, role: req.user.role };
      // The token carries the name (used as the actor in Activity Log
      // entries), so re-issue it - same expiry as the current one.
      const token = await signToken(user, { session: req.user });

      logOwnChange(req, user, "Updated", "updated their profile");

      res.json({
        token,
        user,
        phone: { number: phone.value.phone, country: phone.value.countryShortName },
      });
    } catch (err) {
      sendFailure(res, err, "Failed to update your profile.");
    }
  });

  app.post("/api/account/email", requireAuth, async (req, res) => {
    const newEmail = typeof req.body?.newEmail === "string" ? req.body.newEmail.trim() : "";

    if (!EMAIL_PATTERN.test(newEmail)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    try {
      const current = await getAccountRow(req.user.sub);

      if (!current) {
        return res.status(404).json({ error: "Account not found." });
      }

      const failed = await verifyCurrentPassword(current, req.body?.currentPassword);

      if (failed) {
        return res.status(failed.status).json({ error: failed.error });
      }

      if (newEmail.toLowerCase() === current.email.trim().toLowerCase()) {
        return res.status(400).json({ error: "That is already your email address." });
      }

      const existing = await findUserByEmail(newEmail);

      if (existing && String(existing.id) !== String(req.user.sub)) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }

      // No email can be sent to confirm the new address, so it's marked
      // unverified until an Admin (or a future verification flow) says so.
      await setUserColumns(req.user.sub, {
        [COLUMNS.EMAIL]: { email: newEmail, text: newEmail },
        [COLUMNS.EMAIL_VERIFIED]: { label: USERS_STATUS_OPTIONS.EMAIL_VERIFIED.NO },
      });

      applyAccountChange(req.user.sub, { email: newEmail });
      clearCache([USERS.BOARD_ID]);

      const row = { ...current, email: newEmail, emailVerified: USERS_STATUS_OPTIONS.EMAIL_VERIFIED.NO };
      const user = sessionUserOf(row);
      const token = await signToken(user, { session: req.user });

      logOwnChange(req, row, "Updated", `changed their email from "${current.email}" to "${newEmail}"`);

      res.json({ token, user, account: accountViewOf(row) });
    } catch (err) {
      sendFailure(res, err, "Failed to change your email.");
    }
  });

  app.post("/api/account/password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ error: "The new password must be different from the current one." });
    }

    try {
      const row = await getAccountRow(req.user.sub);

      if (!row) {
        return res.status(404).json({ error: "Account not found." });
      }

      const failed = await verifyCurrentPassword(row, currentPassword);

      if (failed) {
        return res.status(failed.status).json({ error: failed.error });
      }

      await setUserPasswordHash(req.user.sub, await hashPassword(newPassword));

      logOwnChange(req, row, "Password Changed", "changed their password");

      res.json({ ok: true });
    } catch (err) {
      sendFailure(res, err, "Failed to change your password.");
    }
  });

  // Replaces the stored preferences with the (sanitized) object sent - the
  // Settings page always sends the full set, which saves a read per change
  // against Monday's daily call limit.
  app.post("/api/account/preferences", requireAuth, async (req, res) => {
    if (!COLUMNS.PREFERENCES) {
      return res.status(503).json({ error: "Saving preferences isn't set up yet (Users board Preferences column)." });
    }

    const preferences = sanitizePreferences(req.body?.preferences);

    try {
      await setUserColumns(req.user.sub, { [COLUMNS.PREFERENCES]: { text: JSON.stringify(preferences) } });

      res.json({ preferences });
    } catch (err) {
      sendFailure(res, err, "Failed to save your preferences.");
    }
  });
}
