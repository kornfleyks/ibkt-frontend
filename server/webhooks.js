import crypto from "node:crypto";
import { USERS } from "../src/constants/boards/users.js";
import { applyAccountChange, TRACKED_COLUMNS } from "./accountState.js";
import { clearCache } from "./mondayCache.js";

// Receives Monday webhooks for the Users board's Status and Role columns,
// so an edit made directly on Monday reaches the in-memory account state
// (accountState.js) without polling. Registered once with
// scripts/registerUsersWebhooks.js, which needs this server's public URL.
//
// Board webhooks created with a personal API token aren't signed, so the
// URL carries a secret (MONDAY_WEBHOOK_SECRET) and anything else is ignored.

const WEBHOOK_SECRET = process.env.MONDAY_WEBHOOK_SECRET;

function secretMatches(candidate) {
  if (!WEBHOOK_SECRET || typeof candidate !== "string") {
    return false;
  }

  const expected = Buffer.from(WEBHOOK_SECRET);
  const given = Buffer.from(candidate);

  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function registerWebhookRoutes(app) {
  app.post("/api/webhooks/monday/:secret", (req, res) => {
    // 404 rather than 401: don't reveal the endpoint exists.
    if (!secretMatches(req.params.secret)) {
      return res.status(404).end();
    }

    // Monday's one-time URL verification: echo the challenge back.
    if (req.body?.challenge) {
      return res.json({ challenge: req.body.challenge });
    }

    const event = req.body?.event;
    const field = TRACKED_COLUMNS[event?.columnId];

    if (event && String(event.boardId) === USERS.BOARD_ID && field) {
      // Status columns send { label: { text } }; a cleared value sends null.
      const text = event.value?.label?.text ?? "";

      applyAccountChange(event.pulseId, { [field]: text });
      // Cached Users-board reads (e.g. the Users page) are now stale too.
      clearCache();
    }

    // Always 200 so Monday doesn't retry events we deliberately ignore.
    res.status(200).end();
  });
}
