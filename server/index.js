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

const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
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
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!ACTIVE_ACCOUNT_STATUSES.has(user.accountStatus)) {
      return res.status(403).json({ error: "This account is not active yet." });
    }

    const token = signToken(user);
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

  // The generic proxy above stays board-agnostic like the rest of this
  // app's architecture, but a mutation against the Users board can change
  // someone's role or account status - that one case needs a real
  // server-side check, not just a client-side Admin-only page.
  if (mutation && variables?.boardId === USERS_BOARD_ID && req.user.role !== "Admin") {
    return res.status(403).json({ error: "Only Admins can modify user accounts." });
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
      console.error(result.errors);
      return res.status(502).json({ error: result.errors[0].message });
    }

    if (mutation) {
      // A mutation can change data behind any cached read (e.g. matching a
      // cat updates both the cats and active-applications boards), so the
      // simplest correct move is to drop everything rather than track which
      // reads it could have affected.
      clearCache();

      logMutationActivity({ query, variables, result, req, priorSnapshot });
    } else {
      setCached(query, variables, result.data, cacheTtlMs);
    }

    res.json({ data: result.data });
  } catch (err) {
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
    const response = await fetch(`${MONDAY_API_URL}/file`, {
      method: "POST",
      headers: { Authorization: MONDAY_API_TOKEN },
      body: formData,
    });

    const result = await response.json();

    if (result.errors) {
      console.error(result.errors);
      return res.status(502).json({ error: result.errors[0].message });
    }

    // Same reasoning as the mutation branch above: a cached read of this
    // item's file column is now stale.
    clearCache();

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
    console.error(err);
    res.status(500).json({ error: "Upload to Monday failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Upload proxy listening on http://localhost:${PORT}`);
});
