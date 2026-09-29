import multer from "multer";
import { secretMatches } from "../secretMatch.js";
import { isDatabaseEnabled } from "../database/db.js";
import { isJotformEnabled } from "./client.js";
import { receiveSubmission } from "./receive.js";
import { recordWebhookEvent, finishWebhookEvent } from "./webhookEventsStore.js";

// The Jotform webhook (Form > Settings > Integrations > WebHooks):
//
//   POST /api/webhooks/jotform/<JOTFORM_WEBHOOK_SECRET>
//
// Jotform doesn't sign webhooks, so the URL carries a secret and anything
// else gets a 404. Every request with the right secret is first stored as
// it arrived in jotform_webhook_events (webhookEventsStore.js), with its
// outcome afterwards. The submission itself is fetched from the Jotform
// API by id (receive.js), so a forged request changes nothing.

const WEBHOOK_SECRET = process.env.JOTFORM_WEBHOOK_SECRET;

// Jotform posts the answers as form fields (no files); rawRequest can be large.
const parseForm = multer({ limits: { fieldSize: 5 * 1024 * 1024 } }).none();

// The error to store, with a network failure's cause ("fetch failed" alone
// says little).
function errorText(err) {
  const cause = err?.cause?.code ?? err?.cause?.message;

  return `${err?.message ?? err}${cause ? ` (${cause})` : ""}`.slice(0, 2000);
}

// The request as Jotform sent it, with rawRequest (the answers, a JSON
// string) parsed when it can be, so it reads as JSON in the table.
function payloadOf(body) {
  const payload = { ...body };

  if (typeof payload.rawRequest === "string") {
    try {
      payload.rawRequest = JSON.parse(payload.rawRequest);
    } catch {
      // Kept as the text Jotform sent.
    }
  }

  return payload;
}

// Stores the event; the webhook's work goes on even if it can't be stored.
async function storeEvent(event) {
  if (!isDatabaseEnabled()) return null;

  try {
    return await recordWebhookEvent(event);
  } catch (err) {
    console.error("Jotform webhook: could not store the request.", err);
    return null;
  }
}

async function finishEvent(eventId, status, error = null) {
  if (eventId === null) return;

  try {
    await finishWebhookEvent(eventId, status, error);
  } catch (err) {
    console.error(`Jotform webhook: could not record the outcome of event ${eventId}.`, err);
  }
}

async function handleRequest(body) {
  const submissionId = String(body?.submissionID ?? "");
  const formId = body?.formID ? String(body.formID) : null;
  const eventId = await storeEvent({ formId, submissionId: submissionId || null, payload: payloadOf(body) });

  if (!/^\d+$/.test(submissionId)) {
    console.warn("Jotform webhook: request without a submission id - ignored.");
    return finishEvent(eventId, "ignored", "No submission id in the request.");
  }

  if (!isJotformEnabled() || !isDatabaseEnabled()) {
    const error = "JOTFORM_API_KEY or DATABASE_URL is missing on this server.";
    console.error(`Jotform webhook: ${error} Submission ${submissionId} not saved.`);
    return finishEvent(eventId, "failed", error);
  }

  try {
    const result = await receiveSubmission(submissionId, { via: "webhook", expectedFormId: formId });

    await finishEvent(eventId, result.status, result.reason ?? null);
  } catch (err) {
    console.error(`Jotform webhook: submission ${submissionId} not saved.`, err);
    await finishEvent(eventId, "failed", errorText(err));
  }
}

export function registerJotformRoutes(app) {
  app.post(
    "/api/webhooks/jotform/:secret",
    (req, res, next) => {
      // 404 rather than 401: don't reveal the endpoint exists.
      if (!secretMatches(WEBHOOK_SECRET, req.params.secret)) {
        return res.status(404).end();
      }

      next();
    },
    (req, res) => {
      parseForm(req, res, (err) => {
        if (err) {
          console.warn("Jotform webhook: unreadable request.", err.message);
          storeEvent({ payload: { contentType: req.headers["content-type"] ?? null }, status: "failed", error: `Unreadable request: ${errorText(err)}` });
          return res.status(400).end();
        }

        // Answer straight away: storing, fetching and saving can take longer
        // than Jotform waits, and there's nothing useful to tell it.
        res.status(200).end();

        handleRequest(req.body ?? {}).catch((error) => console.error("Jotform webhook: unexpected error.", error));
      });
    },
  );
}
