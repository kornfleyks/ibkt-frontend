import multer from "multer";
import { secretMatches } from "../secretMatch.js";
import { isDatabaseEnabled } from "../database/db.js";
import { isJotformEnabled } from "./client.js";
import { receiveSubmission } from "./receive.js";

// The Jotform webhook (Form > Settings > Integrations > WebHooks):
//
//   POST /api/webhooks/jotform/<JOTFORM_WEBHOOK_SECRET>
//
// Jotform doesn't sign webhooks, so the URL carries a secret and anything
// else gets a 404. The request body (multipart form data) is only used
// for formID and submissionID: the submission itself is fetched from the
// Jotform API (receive.js).

const WEBHOOK_SECRET = process.env.JOTFORM_WEBHOOK_SECRET;

// Jotform posts the answers as form fields (no files); rawRequest can be
// large, but nothing here reads it.
const parseForm = multer({ limits: { fieldSize: 5 * 1024 * 1024 } }).none();

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
          return res.status(400).end();
        }

        const submissionId = String(req.body?.submissionID ?? "");
        const formId = req.body?.formID ? String(req.body.formID) : null;

        // Answer straight away: fetching and saving can take longer than
        // Jotform waits, and there's nothing useful to tell it.
        res.status(200).end();

        if (!/^\d+$/.test(submissionId)) {
          console.warn("Jotform webhook: request without a submission id - ignored.");
          return;
        }

        if (!isJotformEnabled() || !isDatabaseEnabled()) {
          console.error(`Jotform webhook: JOTFORM_API_KEY or DATABASE_URL missing - submission ${submissionId} not saved.`);
          return;
        }

        receiveSubmission(submissionId, { via: "webhook", expectedFormId: formId }).catch((error) =>
          console.error(`Jotform webhook: submission ${submissionId} not saved.`, error),
        );
      });
    },
  );
}
