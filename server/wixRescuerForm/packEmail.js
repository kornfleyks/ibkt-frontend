import crypto from "node:crypto";
import { query } from "../database/db.js";

// Sends the rescuer pack email to each new rescuer request read from Wix
// (pull.js), and records on the row whether it was sent.
//
// Wix Triggered Emails can only be sent from code on the Wix site, so the
// email goes through the Wix Email Transmissions API (REST, API key with the
// permission "Manage Email Marketing"). The type is TRANSACTIONAL, so Wix adds
// no unsubscribe link.
//
// Settings (server/.env, Render):
//   WIX_PACK_EMAIL_ENABLED   "true" to send. Without it nothing is sent.
//   WIX_PACK_URL             the address of the rescuer pack page
//   WIX_PACK_SENDER_NAME     optional, default "Itty Bitty Kitty Tails"
//   WIX_PACK_SENDER_EMAIL    optional, a sender address verified in Wix; without
//                            it Wix sends from its own no-reply address
//   WIX_PACK_REPLY_TO        optional, the address that replies go to
//
// The column pack_email_status of wix_rescuer_submissions:
//   null       never considered (a row stored before this existed, or without an email)
//   pending    waiting to be sent
//   sending    claimed by one server
//   accepted   Wix accepted it and has not reported the delivery yet
//   sent       Wix reports it as sent to the recipient
//   failed     not sent: pack_email_error says why

const SEND_URL = "https://www.wixapis.com/email-transmissions/v1/email-transmissions/send";
const GET_URL = "https://www.wixapis.com/email-transmissions/v1/email-transmissions";
const MAX_ATTEMPTS = 3;
const BATCH = 20;
// A row claimed as "sending" for longer than this is taken as lost (the server stopped).
const STALE_SENDING_MINUTES = 15;

export const packEmailEnabled = () => process.env.WIX_PACK_EMAIL_ENABLED === "true" && Boolean(process.env.WIX_PACK_URL) && Boolean(process.env.WIX_API_KEY && process.env.WIX_SITE_ID);

const headers = () => ({ Authorization: process.env.WIX_API_KEY, "wix-site-id": process.env.WIX_SITE_ID, "Content-Type": "application/json" });

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function firstNameOf(row) {
  const name = row.first_name || String(row.full_name ?? "").trim().split(/\s+/)[0];

  return name || null;
}

function emailOf(row) {
  const name = firstNameOf(row);
  const link = process.env.WIX_PACK_URL;

  return {
    subject: "Your Rescuer Pack from Itty Bitty Kitty Tails",
    html:
      `<p>Hi${name ? ` ${escapeHtml(name)}` : ""},</p>` +
      "<p>Thank you for getting in touch about the cats you are helping. Your Rescuer Pack explains how we work with rescuers and what happens next.</p>" +
      `<p><a href="${escapeHtml(link)}">Open the Rescuer Pack</a></p>` +
      "<p>If you have any questions, reply to this email.</p>" +
      "<p>Itty Bitty Kitty Tails</p>",
    text: `Hi${name ? ` ${name}` : ""},\n\nThank you for getting in touch about the cats you are helping. Your Rescuer Pack explains how we work with rescuers and what happens next.\n\nOpen the Rescuer Pack: ${link}\n\nIf you have any questions, reply to this email.\n\nItty Bitty Kitty Tails`,
  };
}

// The same key for the same row, so a repeated send within Wix's window (about an hour) is not a second email.
function idempotencyKeyOf(deliveryKey) {
  const bytes = crypto.createHash("sha256").update(`pack-email:${deliveryKey}`).digest().subarray(0, 16);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// A Wix error body as one line of text for the row.
const describeError = (status, body) => {
  const code = body?.details?.applicationError?.code;
  const message = body?.message;

  return [`Wix answered ${status}`, code, message].filter(Boolean).join(": ").slice(0, 500);
};

async function sendTo(row) {
  const message = emailOf(row);
  const emailTransmission = {
    emailSubject: message.subject,
    emailHtmlContent: message.html,
    emailTextContent: message.text,
    senderName: process.env.WIX_PACK_SENDER_NAME || "Itty Bitty Kitty Tails",
    toRecipients: [{ emailAddress: row.email, ...(firstNameOf(row) ? { name: firstNameOf(row).slice(0, 50) } : {}) }],
    type: "TRANSACTIONAL",
  };

  if (process.env.WIX_PACK_SENDER_EMAIL) emailTransmission.senderEmailAddress = process.env.WIX_PACK_SENDER_EMAIL;
  if (process.env.WIX_PACK_REPLY_TO) emailTransmission.replyTo = { emailAddress: process.env.WIX_PACK_REPLY_TO };

  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ emailTransmission, idempotencyKey: idempotencyKeyOf(row.delivery_key) }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(describeError(res.status, body));

  const transmission = body.emailTransmission ?? {};
  const recipient = transmission.toRecipients?.[0] ?? {};

  if (recipient.failureReason && recipient.failureReason !== "NONE") throw new Error(`Wix did not send it: ${recipient.failureReason}`);
  if (transmission.status === "REJECTED" || transmission.status === "ABORTED") throw new Error(`Wix ${transmission.status.toLowerCase()} the email.`);

  return transmission.id ?? transmission._id ?? null;
}

// Claims the rows waiting to be sent, so that two servers do not send the same one.
async function claimRows() {
  const { rows } = await query(
    `update wix_rescuer_submissions
        set pack_email_status = 'sending', pack_email_attempts = pack_email_attempts + 1, pack_email_last_attempt_at = now()
      where id in (
        select id from wix_rescuer_submissions
         where email is not null and pack_email_attempts < $1
           and (pack_email_status = 'pending'
                or (pack_email_status = 'sending' and pack_email_last_attempt_at < now() - make_interval(mins => $2)))
         order by id
         limit $3
         for update skip locked)
      returning id, delivery_key, email, first_name, full_name, pack_email_attempts`,
    [MAX_ATTEMPTS, STALE_SENDING_MINUTES, BATCH],
  );

  return rows;
}

// Sends the waiting emails and the delivery check of the accepted ones. Resolves to { sent, failed, delivered }.
export async function sendPackEmails() {
  const result = { sent: 0, failed: 0, delivered: 0 };

  if (!packEmailEnabled()) return result;

  for (const row of await claimRows()) {
    try {
      const transmissionId = await sendTo(row);

      await query(
        "update wix_rescuer_submissions set pack_email_status = 'accepted', pack_email_transmission_id = $2, pack_email_error = null where id = $1",
        [row.id, transmissionId],
      );
      result.sent += 1;
    } catch (err) {
      // Tried again on the next read until MAX_ATTEMPTS, then left failed with the reason.
      const final = row.pack_email_attempts >= MAX_ATTEMPTS;

      await query("update wix_rescuer_submissions set pack_email_status = $2, pack_email_error = $3 where id = $1", [row.id, final ? "failed" : "pending", String(err.message).slice(0, 500)]);
      if (final) result.failed += 1;
      console.error(`Wix rescuer pack email for submission ${row.id} failed (attempt ${row.pack_email_attempts}).`, err.message);
    }
  }

  result.delivered = await checkAccepted();

  return result;
}

// Asks Wix for the outcome of the emails it accepted: sent, or failed with a reason.
async function checkAccepted() {
  const { rows } = await query(
    "select id, pack_email_transmission_id from wix_rescuer_submissions where pack_email_status = 'accepted' and pack_email_transmission_id is not null order by id limit $1",
    [BATCH],
  );
  let delivered = 0;

  for (const row of rows) {
    try {
      const res = await fetch(`${GET_URL}/${encodeURIComponent(row.pack_email_transmission_id)}`, { headers: headers(), signal: AbortSignal.timeout(20_000) });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(describeError(res.status, body));

      const transmission = body.emailTransmission ?? {};
      const recipient = transmission.toRecipients?.[0] ?? {};

      if (recipient.status === "SENT") {
        await query("update wix_rescuer_submissions set pack_email_status = 'sent', pack_email_sent_at = now(), pack_email_error = null where id = $1", [row.id]);
        delivered += 1;
      } else if (recipient.status === "FAILED" || transmission.status === "REJECTED" || transmission.status === "ABORTED") {
        const reason = recipient.failureReason && recipient.failureReason !== "NONE" ? recipient.failureReason : transmission.status;

        await query("update wix_rescuer_submissions set pack_email_status = 'failed', pack_email_error = $2 where id = $1", [row.id, `Wix could not deliver it: ${reason}`.slice(0, 500)]);
      }
      // Otherwise Wix is still working on it: checked again on the next read.
    } catch (err) {
      console.error(`Wix rescuer pack email: checking transmission for submission ${row.id} failed.`, err.message);
    }
  }

  return delivered;
}
