import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";

import { isMutation, getCached, setCached, clearCache } from "./mondayCache.js";
import {
  USERS_BOARD_ID,
  findUserByEmail,
  createPendingUser,
  setUserPasswordHash,
  setUserLastLogin,
  hashPassword,
  comparePassword,
  signToken,
  requireAuth,
  requireAdmin,
} from "./auth.js";
import {
  logActivity,
  resolveBoardName,
  resolveColumnLabel,
  describeColumnValue,
  getItemSnapshot,
  getItemName,
  CATS_BOARD_ID,
} from "./activityLog.js";
import { getLoginMaxAttempts, getLoginLockoutMinutes, loadAppSettings, invalidateSettingsCache } from "./appSettings.js";
import { APP_SETTINGS } from "../src/constants/boards/appSettings.js";
import { registerMondayApiVersionRoutes, startMondayApiVersionChecks } from "./mondayApiVersionCheck.js";
import { registerCaseOwnerRoutes, CASE_OWNER_COLUMN_ID } from "./caseOwner.js";
import { initAccountState, applyAccountChange, TRACKED_COLUMNS, NAME_COLUMNS } from "./accountState.js";
import { registerUserAdminRoutes } from "./userAdmin.js";
import { registerWebhookRoutes } from "./webhooks.js";
import { registerSessionEventRoutes } from "./sessionEvents.js";
import { registerNotificationRoutes, notifyFromTaskMutation, NOTIFICATIONS_BOARD_ID } from "./notifications.js";
import { registerCommunicationRoutes } from "./communications.js";
import { mondayHeaders } from "./mondayApiVersion.js";
import { mondayFetch } from "./mondayRateLimit.js";

const PORT = process.env.PORT || 4000;
const MONDAY_API_URL = process.env.MONDAY_API_URL;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const REGISTRATION_INVITE_CODE = process.env.REGISTRATION_INVITE_CODE;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!MONDAY_API_URL || !MONDAY_API_TOKEN) {
  throw new Error(
    "MONDAY_API_URL and MONDAY_API_TOKEN must be set in server/.env (see server/.env.example).",
  );
}

if (!REGISTRATION_INVITE_CODE) {
  throw new Error(
    "REGISTRATION_INVITE_CODE must be set in server/.env (see server/.env.example).",
  );
}

const ITEM_ID_PATTERN = /^\d+$/;
const COLUMN_ID_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIVE_ACCOUNT_STATUSES = new Set(["Active"]);

// Per-email login lockout state, in memory - resets on server restart, same
// tradeoff already accepted for mondayCache.js. Keyed by normalized email,
// not IP: this is account lockout (protecting one account from being
// brute-forced), not general request throttling.
const loginAttempts = new Map();

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function checkLoginLockout(email) {
  const entry = loginAttempts.get(normalizeEmail(email));

  if (!entry?.lockedUntil || entry.lockedUntil <= Date.now()) {
    return null;
  }

  return Math.ceil((entry.lockedUntil - Date.now()) / 60_000);
}

async function recordFailedLogin(email) {
  const key = normalizeEmail(email);
  const entry = loginAttempts.get(key) ?? { failureCount: 0, lockedUntil: null };

  entry.failureCount += 1;

  const maxAttempts = await getLoginMaxAttempts();

  if (entry.failureCount >= maxAttempts) {
    const lockoutMinutes = await getLoginLockoutMinutes();

    entry.lockedUntil = Date.now() + lockoutMinutes * 60_000;
    entry.failureCount = 0;
  }

  loginAttempts.set(key, entry);
}

function clearLoginAttempts(email) {
  loginAttempts.delete(normalizeEmail(email));
}

// The whole app's mutations funnel through exactly these 4 shapes (verified
// against every services/*.js file) - matching on the mutation name in the
// query text is reliable here without needing real GraphQL parsing.
const MUTATION_KIND_PATTERNS = {
  createItem: /create_item\s*\(/,
  changeColumnValue: /change_column_value\s*\(/,
  updateAssets: /update_assets_on_item\s*\(/,
  createUpdate: /create_update\s*\(/,
};

// Decodes a just-succeeded /api/monday mutation into a human-readable
// Activity Log entry. Always fire-and-forget (never awaited by the
// caller) - logActivity swallows its own errors, so this never risks the
// real request it's attached to.
function logMutationActivity({ query, variables, result, req, priorSnapshot }) {
  const actorId = req.user.sub;
  const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();

  if (MUTATION_KIND_PATTERNS.createItem.test(query) && variables?.boardId && variables?.itemName) {
    const boardName = resolveBoardName(variables.boardId);
    const createdId = result.data?.create_item?.id ?? "";

    logActivity({
      actorId,
      actorName,
      boardId: variables.boardId,
      boardName,
      itemId: createdId,
      itemName: variables.itemName,
      actionType: "Created",
      description: `${actorName} created "${variables.itemName}" on ${boardName}`,
      raw: variables,
    });
    return;
  }

  if (
    MUTATION_KIND_PATTERNS.changeColumnValue.test(query) &&
    variables?.boardId &&
    variables?.itemId &&
    variables?.columnId
  ) {
    const boardName = resolveBoardName(variables.boardId);
    const fieldChanged = resolveColumnLabel(variables.boardId, variables.columnId);
    const newValueText = describeColumnValue(variables.value);
    const oldValueText = priorSnapshot?.columnText || "(empty)";
    const itemName = priorSnapshot?.itemName || `item ${variables.itemId}`;

    logActivity({
      actorId,
      actorName,
      boardId: variables.boardId,
      boardName,
      itemId: variables.itemId,
      itemName,
      actionType: "Updated",
      description: `${actorName} changed ${fieldChanged} from "${oldValueText}" to "${newValueText}" on ${itemName}`,
      fieldChanged,
      oldValue: oldValueText,
      newValue: newValueText,
      raw: variables,
    });
    return;
  }

  if (
    MUTATION_KIND_PATTERNS.updateAssets.test(query) &&
    variables?.boardId &&
    variables?.itemId &&
    variables?.columnId
  ) {
    const boardName = resolveBoardName(variables.boardId);
    const fieldChanged = resolveColumnLabel(variables.boardId, variables.columnId);

    getItemName(variables.itemId).then((itemName) => {
      const resolvedName = itemName || `item ${variables.itemId}`;

      logActivity({
        actorId,
        actorName,
        boardId: variables.boardId,
        boardName,
        itemId: variables.itemId,
        itemName: resolvedName,
        actionType: "Updated",
        description: `${actorName} updated ${fieldChanged} files on ${resolvedName}`,
        fieldChanged,
        raw: variables,
      });
    });
    return;
  }

  // create_update (Cat Communications) doesn't send a board_id at all.
  if (MUTATION_KIND_PATTERNS.createUpdate.test(query) && variables?.itemId) {
    getItemName(variables.itemId).then((itemName) => {
      const resolvedName = itemName || `item ${variables.itemId}`;

      logActivity({
        actorId,
        actorName,
        boardId: CATS_BOARD_ID,
        boardName: "Cats",
        itemId: variables.itemId,
        itemName: resolvedName,
        actionType: "Commented",
        description: `${actorName} added a comment on ${resolvedName}`,
        raw: variables,
      });
    });
  }
}

// Monday refused because of its rate limit: pass on a readable message and
// when to retry, instead of a generic failure. True when handled.
function sendRateLimited(res, err) {
  if (!err?.rateLimited) {
    return false;
  }

  res.set("Retry-After", String(err.retryAfterSeconds));
  res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });

  return true;
}

const app = express();

// X-User-Role is set by requireAuth so the app can pick up a role change live.
app.use(cors({ origin: ALLOWED_ORIGINS, exposedHeaders: ["X-User-Role"] }));
app.use(express.json());

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const lockedMinutesRemaining = await checkLoginLockout(email);

  if (lockedMinutesRemaining !== null) {
    return res.status(429).json({
      error: `Too many failed login attempts. Try again in ${lockedMinutesRemaining} minute(s).`,
    });
  }

  try {
    const user = await findUserByEmail(email);

    // Same generic error for "no such user" and "wrong password" - being
    // specific here just tells an attacker which emails are registered.
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);

    if (!passwordMatches) {
      await recordFailedLogin(email);
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!ACTIVE_ACCOUNT_STATUSES.has(user.accountStatus)) {
      return res.status(403).json({ error: "This account is not active yet." });
    }

    clearLoginAttempts(email);

    // Fire-and-forget: a failed Last Login write must never block a login.
    setUserLastLogin(user.id).catch((err) => console.error("Failed to record last login:", err.message));

    const token = await signToken(user);
    const fullName = `${user.firstName} ${user.lastName}`.trim();

    logActivity({
      actorId: user.id,
      actorName: fullName,
      boardId: USERS_BOARD_ID,
      boardName: "Users",
      itemId: user.id,
      itemName: fullName,
      actionType: "Login",
      description: `${fullName} logged in`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed." });
  }
});

app.post("/api/register", async (req, res) => {
  const { firstName, lastName, email, password, inviteCode } = req.body;

  if (!firstName || !lastName || !email || !password || !inviteCode) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  if (inviteCode !== REGISTRATION_INVITE_CODE) {
    return res.status(403).json({ error: "Invalid invite code." });
  }

  try {
    const existing = await findUserByEmail(email);

    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await hashPassword(password);

    const newUserId = await createPendingUser({ firstName, lastName, email, passwordHash });
    const fullName = `${firstName} ${lastName}`.trim();

    logActivity({
      actorId: newUserId,
      actorName: fullName,
      boardId: USERS_BOARD_ID,
      boardName: "Users",
      itemId: newUserId,
      itemName: fullName,
      actionType: "Register",
      description: `${fullName} registered a new account (pending approval)`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed." });
  }
});

// Sessions are stateless JWTs - there's no server-side state to invalidate
// here. This endpoint exists purely so a logout produces an Activity Log
// entry, the same way a login does.
app.post("/api/logout", requireAuth, (req, res) => {
  const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();

  logActivity({
    actorId: req.user.sub,
    actorName,
    boardId: USERS_BOARD_ID,
    boardName: "Users",
    itemId: req.user.sub,
    itemName: actorName,
    actionType: "Logout",
    description: `${actorName} logged out`,
  });

  res.json({ ok: true });
});

// Password hashing has to happen here, never in the browser - this is the
// only way an Admin can set/reset someone's password.
app.post("/api/admin/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!ITEM_ID_PATTERN.test(id)) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    const passwordHash = await hashPassword(newPassword);

    await setUserPasswordHash(id, passwordHash);

    const targetName = await getItemName(id);
    const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();

    logActivity({
      actorId: req.user.sub,
      actorName,
      boardId: USERS_BOARD_ID,
      boardName: "Users",
      itemId: id,
      itemName: targetName,
      actionType: "Password Reset",
      description: `${actorName} reset the password for ${targetName || `user ${id}`}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to set password." });
  }
});

registerCaseOwnerRoutes(app, { requireAuth });
registerUserAdminRoutes(app, { requireAuth, requireAdmin });
registerWebhookRoutes(app);
registerSessionEventRoutes(app, { requireAuth });
registerNotificationRoutes(app, { requireAuth });
registerCommunicationRoutes(app, { requireAuth });
registerMondayApiVersionRoutes(app, { requireAuth, requireAdmin });

// The frontend never talks to Monday directly: it has no way to hold an API
// token without shipping it in the public JS bundle. Every Monday GraphQL
// call is proxied through here instead, so the token only ever lives on
// this server.
app.post("/api/monday", requireAuth, async (req, res) => {
  const { query, variables, cacheTtlMs } = req.body;

  if (!query) {
    return res.status(400).json({ error: "query is required." });
  }

  const mutation = isMutation(query);

  // Notifications are personal - they're only served, per user, by
  // /api/notifications. Best-effort like the other board guards: it catches
  // any request naming the board, not a read of a notification item by id.
  if (query.includes(NOTIFICATIONS_BOARD_ID) || JSON.stringify(variables ?? {}).includes(NOTIFICATIONS_BOARD_ID)) {
    return res.status(403).json({ error: "Notifications are only available through /api/notifications." });
  }

  // The generic proxy above stays board-agnostic like the rest of this
  // app's architecture, but a mutation against the Users board can change
  // someone's role or account status - that one case needs a real
  // server-side check, not just a client-side Admin-only page.
  if (mutation && variables?.boardId === USERS_BOARD_ID && req.user.role !== "Admin") {
    return res.status(403).json({ error: "Only Admins can modify user accounts." });
  }

  // Case Owner assignment rules (who may assign, who may be picked) live in
  // POST /api/applications/:id/case-owner. Any mutation mentioning the
  // column - in the query text or the variables - is refused here, so
  // those rules can't be skipped with a hand-written request.
  if (
    mutation &&
    (query.includes(CASE_OWNER_COLUMN_ID) || JSON.stringify(variables ?? {}).includes(CASE_OWNER_COLUMN_ID))
  ) {
    return res.status(403).json({ error: "Case Owner can only be changed through the case owner endpoint." });
  }

  // Account Status goes through POST /api/admin/users/:id/status, which
  // hands over open work on Suspend/Archive and keeps the live account
  // state in step - a direct write here would skip both.
  const accountStatusColumn = Object.keys(TRACKED_COLUMNS).find((columnId) => TRACKED_COLUMNS[columnId] === "accountStatus");

  if (
    mutation &&
    (query.includes(accountStatusColumn) || JSON.stringify(variables ?? {}).includes(accountStatusColumn))
  ) {
    return res.status(403).json({ error: "Account status can only be changed through the user status endpoint." });
  }

  if (!mutation) {
    const cached = getCached(query, variables);

    if (cached !== undefined) {
      return res.json({ data: cached });
    }
  }

  // change_column_value only ever carries the *new* value - reading the
  // item's current value here, before the mutation runs, is the only way
  // the activity log can later show what a field changed *from*.
  const isChangeColumnValue = mutation && MUTATION_KIND_PATTERNS.changeColumnValue.test(query);
  const priorSnapshot =
    isChangeColumnValue && variables?.itemId && variables?.columnId
      ? await getItemSnapshot(variables.itemId, variables.columnId)
      : null;

  try {
    const response = await mondayFetch(MONDAY_API_URL, {
      method: "POST",
      headers: mondayHeaders(),
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error(result.errors);
      return res.status(502).json({ error: result.errors[0].message });
    }

    if (mutation) {
      // Drops cached reads of the changed board and every board linked to it
      // (e.g. matching a cat updates both cats and applications). A mutation
      // that names no board (e.g. create_update) drops everything.
      clearCache(variables?.boardId ? [variables.boardId] : undefined);

      // App Settings changed through the app (e.g. a new Monday API version)
      // apply on the next request instead of after the settings refresh.
      if (String(variables?.boardId) === APP_SETTINGS.BOARD_ID) {
        invalidateSettingsCache();
      }

      // A role change made through the Users page applies to that user's
      // very next request (requireAuth reads the live account state).
      if (
        isChangeColumnValue &&
        variables?.boardId === USERS_BOARD_ID &&
        TRACKED_COLUMNS[variables?.columnId] === "role"
      ) {
        try {
          applyAccountChange(variables.itemId, { role: JSON.parse(variables.value)?.label ?? "" });
        } catch {
          // Unparseable value - the state is re-read at the next restart.
        }
      }

      // A rename through the Users page keeps the in-memory name (used for
      // @mentions and notification recipients) current.
      if (isChangeColumnValue && variables?.boardId === USERS_BOARD_ID && NAME_COLUMNS[variables?.columnId]) {
        try {
          applyAccountChange(variables.itemId, { [NAME_COLUMNS[variables.columnId]]: JSON.parse(variables.value) ?? "" });
        } catch {
          // Unparseable value - the state is re-read at the next restart.
        }
      }

      logMutationActivity({ query, variables, result, req, priorSnapshot });

      const mutationKind = MUTATION_KIND_PATTERNS.createItem.test(query)
        ? "createItem"
        : isChangeColumnValue
          ? "changeColumnValue"
          : null;

      if (mutationKind) {
        notifyFromTaskMutation({
          kind: mutationKind,
          variables,
          result,
          actor: { id: req.user.sub, name: `${req.user.firstName} ${req.user.lastName}`.trim() },
          priorSnapshot,
        });
      }
    } else {
      await setCached(query, variables, result.data, cacheTtlMs);
    }

    res.json({ data: result.data });
  } catch (err) {
    if (sendRateLimited(res, err)) {
      return;
    }

    console.error(err);
    res.status(500).json({ error: "Request to Monday failed." });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// The only job of this server: hold the Monday API token server-side and
// forward file uploads to Monday's /v2/file endpoint. Browsers can never
// call that endpoint directly - it doesn't send CORS headers - so this is
// the minimum needed to make file uploads work at all.
app.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
  const { itemId, columnId } = req.body;
  const file = req.file;

  if (!itemId || !columnId || !file) {
    return res.status(400).json({ error: "itemId, columnId and file are all required." });
  }

  if (!ITEM_ID_PATTERN.test(itemId) || !COLUMN_ID_PATTERN.test(columnId)) {
    return res.status(400).json({ error: "Invalid itemId or columnId." });
  }

  const query = `
    mutation ($file: File!) {
      add_file_to_column (
        item_id: ${itemId},
        column_id: "${columnId}",
        file: $file
      ) {
        id
      }
    }
  `;

  const formData = new FormData();
  formData.append("query", query);
  formData.append(
    "variables[file]",
    new Blob([file.buffer], { type: file.mimetype }),
    file.originalname,
  );

  try {
    const response = await mondayFetch(`${MONDAY_API_URL}/file`, {
      method: "POST",
      headers: mondayHeaders({ json: false }),
      body: formData,
    });

    const result = await response.json();

    if (result.errors) {
      console.error(result.errors);
      return res.status(502).json({ error: result.errors[0].message });
    }

    // A cached read of this item's file column is now stale (uploads are
    // Cats-only today - see below).
    clearCache([CATS_BOARD_ID]);

    // Only CatsService.js calls this endpoint today - same hardcoded-board
    // reasoning as the create_update (Communications) case above.
    const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();
    const fieldChanged = resolveColumnLabel(CATS_BOARD_ID, columnId);

    getItemName(itemId).then((name) => {
      const resolvedName = name || `item ${itemId}`;

      logActivity({
        actorId: req.user.sub,
        actorName,
        boardId: CATS_BOARD_ID,
        boardName: "Cats",
        itemId,
        itemName: resolvedName,
        actionType: "Updated",
        description: `${actorName} uploaded a file to ${fieldChanged} on ${resolvedName}`,
        fieldChanged,
        raw: { itemId, columnId, fileName: file.originalname },
      });
    });

    res.json(result.data.add_file_to_column);
  } catch (err) {
    if (sendRateLimited(res, err)) {
      return;
    }

    console.error(err);
    res.status(500).json({ error: "Upload to Monday failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Upload proxy listening on http://localhost:${PORT}`);
  // Settings first: they carry the MONDAY_API_VERSION pin used by every
  // later Monday request.
  loadAppSettings().finally(initAccountState);
  startMondayApiVersionChecks();
});
