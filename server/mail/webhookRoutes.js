import crypto from "node:crypto";
import { recordEvent } from "../database/emailLogStore.js";
import { isDatabaseEnabled } from "../database/db.js";
import { normalizeMessageId } from "./mailgunClient.js";

// Mailgun's delivery webhooks (Sending > Webhooks in the Mailgun dashboard -
// add this one URL under every event you want: delivered, permanent_fail,
// temporary_fail, complained, unsubscribed, opened, clicked, ...): updates
// email_log with what happened to a message after mailgunClient.sendEmail
// handed it to Mailgun. Mailgun's own dashboard only keeps this for a day;
// this is the lasting record.
//
// Signed, not a URL secret like webhooks.js's Monday ones: Mailgun computes
// signature = HMAC-SHA256(signing key, timestamp + token), which only the
// account's own signing key (Mailgun dashboard > Settings > Webhooks > HTTP
// webhook signing key) could produce.

const SIGNING_KEY = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
const MAX_AGE_SECONDS = 15 * 60;

// Returns why, never the secret itself - so a failed verification can be
// told apart in the logs (missing env var vs. wrong key vs. a stale test
// request) instead of all looking like the same 401.
function checkSignature({ timestamp, token, signature } = {}) {
  if (!SIGNING_KEY) {
    return "MAILGUN_WEBHOOK_SIGNING_KEY isn't set on this server.";
  }

  if (!timestamp || !token || !signature) {
    return "Request is missing signature.timestamp/token/signature.";
  }

  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) {
    return `Timestamp is more than ${MAX_AGE_SECONDS}s old (clock skew, or a stale/replayed request).`;
  }

  const expected = crypto.createHmac("sha256", SIGNING_KEY).update(`${timestamp}${token}`).digest("hex");

  let matches;

  try {
    matches = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return "signature isn't valid hex (unexpected payload shape).";
  }

  return matches ? null : "HMAC didn't match - MAILGUN_WEBHOOK_SIGNING_KEY is likely wrong.";
}

export function registerMailgunWebhookRoutes(app) {
  app.post("/api/webhooks/mailgun", (req, res) => {
    const failure = checkSignature(req.body?.signature);

    if (failure) {
      console.warn(`Mailgun webhook: rejected - ${failure}`);
      return res.status(401).end();
    }

    // Always 200 once verified, so Mailgun doesn't retry events we can't
    // match to a row (e.g. sent before this table existed) or that arrive
    // before the database is enabled.
    res.status(200).end();

    const data = req.body?.["event-data"];
    const messageId = normalizeMessageId(data?.message?.headers?.["message-id"]);

    if (!isDatabaseEnabled() || !data?.event || !messageId) {
      return;
    }

    recordEvent(messageId, { status: data.event, payload: data }).catch((err) =>
      console.error("Mailgun webhook: failed to record the event.", err.message),
    );
  });
}
