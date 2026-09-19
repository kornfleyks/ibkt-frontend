import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";

import { isMutation, getCached, setCached, clearCache } from "./mondayCache.js";

const PORT = process.env.PORT || 4000;
const MONDAY_API_URL = process.env.MONDAY_API_URL;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!MONDAY_API_URL || !MONDAY_API_TOKEN) {
  throw new Error(
    "MONDAY_API_URL and MONDAY_API_TOKEN must be set in server/.env (see server/.env.example).",
  );
}

const ITEM_ID_PATTERN = /^\d+$/;
const COLUMN_ID_PATTERN = /^[a-zA-Z0-9_]+$/;

const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// The frontend never talks to Monday directly: it has no way to hold an API
// token without shipping it in the public JS bundle. Every Monday GraphQL
// call is proxied through here instead, so the token only ever lives on
// this server.
app.post("/api/monday", async (req, res) => {
  const { query, variables, cacheTtlMs } = req.body;

  if (!query) {
    return res.status(400).json({ error: "query is required." });
  }

  const mutation = isMutation(query);

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
app.post("/api/upload", upload.single("file"), async (req, res) => {
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
