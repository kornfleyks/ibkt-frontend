import express from "express";
import { secretMatches } from "../secretMatch.js";
import { isDatabaseEnabled } from "../database/db.js";
import { answer, HttpError } from "../httpAnswer.js";
import { insertSubmission, listSubmissions } from "./store.js";

// The Wix rescuer form talks to the app. In Wix, an Automation triggered by
// the form's submission runs the action "Send HTTP request" (POST) to
//
//   POST /api/webhooks/wix/rescuer-form/<WIX_WEBHOOK_SECRET>
//
// The secret is part of the address, as for the Jotform and Monday
// webhooks, because Wix's documentation for that action does not mention
// request headers or signing. A wrong or missing secret gets a 404, so the
// address does not reveal itself. The body is stored as received (JSON or a
// form post); a reply goes out at once, since Wix waits for it.
//
//   GET /api/wix-rescuer-submissions   Admin: what was received, newest first
//
// The secret is in server/.env only (WIX_WEBHOOK_SECRET, a long random
// string) and in the automation's address in Wix, never in the repository.

const WEBHOOK_SECRET = process.env.WIX_WEBHOOK_SECRET;
// A form submission is small. A bigger body is refused, not stored.
const MAX_BODY_BYTES = 100 * 1024;

const readBody = [express.json({ limit: MAX_BODY_BYTES }), express.urlencoded({ extended: false, limit: MAX_BODY_BYTES })];

export function registerWixRescuerFormRoutes(app, { requireAuth, requireAdmin }) {
  app.post(
    "/api/webhooks/wix/rescuer-form/:secret",
    (req, res, next) => {
      // 404 rather than 401: don't reveal the endpoint exists.
      if (!secretMatches(WEBHOOK_SECRET, req.params.secret)) return res.status(404).end();

      next();
    },
    // The app reads JSON bodies up to 2 MB before any route runs, so the
    // smaller limit for this one is checked on the declared size.
    (req, res, next) => (Number(req.headers["content-length"] ?? 0) > MAX_BODY_BYTES ? res.status(413).json({ error: "The request is too large." }) : next()),
    ...readBody,
    async (req, res) => {
      const payload = req.body;

      if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "The request body is empty." });
      }

      if (!isDatabaseEnabled()) return res.status(503).json({ error: "The app can't store submissions yet." });

      try {
        await insertSubmission(payload);

        // Also 200 for a body already stored, so Wix does not repeat it.
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Wix rescuer form: submission not saved.", err);
        res.status(500).json({ error: "Not saved." });
      }
    },
  );

  app.get("/api/wix-rescuer-submissions", requireAuth, requireAdmin, (req, res) => {
    if (!isDatabaseEnabled()) return answer(res, Promise.reject(new HttpError(503, "The database isn't switched on.")), "Wix rescuer submissions");

    answer(res, listSubmissions().then((submissions) => ({ submissions })), "Wix rescuer submissions");
  });
}
