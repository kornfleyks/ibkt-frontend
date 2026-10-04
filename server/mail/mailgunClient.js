// General-purpose Mailgun sender. Other features (password reset,
// notifications, etc.) send email by importing sendEmail from here instead
// of talking to Mailgun's API directly, so moving provider or domain later
// only changes this module.
//
// Currently points at the Mailgun sandbox domain, which only delivers to
// recipients authorized in the Mailgun dashboard (Sending > Domains > the
// sandbox domain > Authorized Recipients). Swapping to a verified domain
// later is an env var change, not a code change.

import Mailgun from "mailgun.js";
import FormData from "form-data";

const API_KEY = process.env.MAILGUN_API_SANDBOX_KEY;
const DOMAIN = process.env.MAILGUN_SANDBOX_DOMAIN;
const API_BASE_URL = process.env.MAILGUN_API_BASE_URL;

const client = API_KEY ? new Mailgun(FormData).client({ username: "api", key: API_KEY, url: API_BASE_URL }) : null;

export function isMailerConfigured() {
  return Boolean(API_KEY && DOMAIN);
}

// Mailgun writes a message id with angle brackets in a send response
// ("<...@domain>") but without them in its webhook events - normalized so
// mail/accountEmails.js and mail/webhookRoutes.js agree on one value to
// match a send to its later delivery events in email_log.
export function normalizeMessageId(value) {
  return String(value ?? "").replace(/[<>]/g, "");
}

// from defaults to the sandbox domain's postmaster; pass a real "from" once
// a verified domain exists. Resolves to Mailgun's { id, message } - id is
// this send's message id, for recording in email_log.
export async function sendEmail({ to, subject, text, html, from = `IBKT System <postmaster@${DOMAIN}>` }) {
  if (!isMailerConfigured()) {
    throw new Error("Mailgun isn't configured (MAILGUN_API_SANDBOX_KEY / MAILGUN_SANDBOX_DOMAIN missing).");
  }

  if (!to || !subject || (!text && !html)) {
    throw new Error("sendEmail needs to, subject, and text or html.");
  }

  return client.messages.create(DOMAIN, { from, to, subject, text, html });
}
