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

    await createPendingUser({ firstName, lastName, email, passwordHash });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed." });
  }
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

    res.json(result.data.add_file_to_column);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload to Monday failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Upload proxy listening on http://localhost:${PORT}`);
});
