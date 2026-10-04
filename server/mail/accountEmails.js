import { USERS } from "../../src/constants/boards/users.js";
import { logActivity, resolveBoardName } from "../activityLog.js";
import { isDatabaseEnabled } from "../database/db.js";
import { recordSend } from "../database/emailLogStore.js";
import { sendEmail, isMailerConfigured, normalizeMessageId } from "./mailgunClient.js";

// Account lifecycle emails: registering and being approved. Fire-and-forget
// on purpose - by the time either is called the account change itself has
// already succeeded, so a Mailgun failure is logged, never surfaced to the
// caller or allowed to undo the change.
//
// Every attempt goes on the Activity Log (sent/failed/skipped, against the
// recipient) and, when the database is enabled, the email_log table - keyed
// by Mailgun's message id, so mail/webhookRoutes.js can later update it with
// what actually happened to the email (Mailgun's own dashboard only keeps
// that for a day).
const BOARD_ID = USERS.BOARD_ID;
const BOARD_NAME = resolveBoardName(BOARD_ID);

const ACTION_TYPES = { sent: "Email Sent", failed: "Email Failed", skipped: "Email Skipped" };

function describe(status, { subject, to, error }) {
  switch (status) {
    case "sent":
      return `Sent "${subject}" to ${to}.`;
    case "skipped":
      return `"${subject}" to ${to} was skipped - Mailgun isn't configured.`;
    default:
      return `Failed to send "${subject}" to ${to}: ${error}`;
  }
}

async function sendOrLog(kind, label, { to, subject, text }, { userId, userName, actorId, actorName }) {
  let status;
  let error;
  let messageId;

  if (!isMailerConfigured()) {
    console.warn(`${label}: Mailgun isn't configured, skipping.`);
    status = "skipped";
  } else {
    try {
      const result = await sendEmail({ to, subject, text });
      status = "sent";
      messageId = normalizeMessageId(result?.id);
    } catch (err) {
      console.error(`${label}: failed to send.`, err.message);
      status = "failed";
      error = err.message;
    }
  }

  logActivity({
    boardId: BOARD_ID,
    boardName: BOARD_NAME,
    itemId: userId,
    itemName: userName,
    actorId: actorId ?? userId,
    actorName: actorName ?? userName,
    actionType: ACTION_TYPES[status],
    description: describe(status, { subject, to, error }),
  });

  if (isDatabaseEnabled()) {
    recordSend({
      messageId,
      userId,
      toAddress: to,
      subject,
      kind,
      status,
      error,
      sentById: actorId ?? userId,
      sentByName: actorName ?? userName,
    }).catch((err) => console.error("Email log: failed to record the send.", err.message));
  }
}

export function sendRegistrationPendingEmail({ userId, email, firstName, lastName }) {
  const userName = `${firstName} ${lastName}`.trim();

  return sendOrLog(
    "registration_pending",
    "Registration pending email",
    {
      to: email,
      subject: "Your IBKT account is pending approval",
      text: `Hi ${firstName},\n\nThanks for registering with IBKT System. Your account is pending approval from an administrator. You'll receive another email once it's approved and you can log in.\n\nIBKT System`,
    },
    { userId, userName },
  );
}

export function sendAccountApprovedEmail({ userId, email, firstName, lastName, actor }) {
  const userName = `${firstName} ${lastName}`.trim();

  return sendOrLog(
    "account_approved",
    "Account approved email",
    {
      to: email,
      subject: "Your IBKT account has been approved",
      text: `Hi ${firstName},\n\nGood news - your IBKT System account has been approved. You can now log in.\n\nIBKT System`,
    },
    { userId, userName, actorId: actor?.id, actorName: actor?.name },
  );
}
