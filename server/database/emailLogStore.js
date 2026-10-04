import { query } from "./db.js";

// The email_log table (scripts/databaseSchema.js): every email
// mail/accountEmails.js sent, and what Mailgun later reported happened to
// it (mail/webhookRoutes.js updates the row by message_id as events
// arrive). App-only: never sent to Monday.
//
// status starts as whatever the send attempt itself was ("sent", "failed",
// "skipped") and moves to Mailgun's own event name ("delivered", "bounced",
// "complained", "opened", ...) once a webhook for that message arrives -
// always the most recent event, not a history (last_event keeps that
// event's raw payload, for anything the status alone doesn't say).

export async function recordSend({ messageId, userId, toAddress, subject, kind, status, error, sentById, sentByName }) {
  await query(
    `insert into email_log (message_id, user_id, to_address, subject, kind, status, error, sent_by_id, sent_by_name)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [messageId ?? null, userId ?? null, toAddress, subject, kind, status, error ?? null, sentById ?? null, sentByName ?? null],
  );
}

// True if a row for `messageId` was found and updated - false for an event
// on a message this server didn't send, or sent before this table existed.
export async function recordEvent(messageId, { status, payload }) {
  const { rowCount } = await query(
    `update email_log set status = $2, last_event = $3, updated_at = now() where message_id = $1`,
    [messageId, status, JSON.stringify(payload)],
  );

  return rowCount > 0;
}
