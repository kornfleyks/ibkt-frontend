import { USERS } from "../../src/constants/boards/users.js";
import { sendOrLog } from "./accountEmails.js";

// Emails of the foster onboarding flow (docs/foster-onboarding.md), the same as
// the rescuer ones (rescuerEmails.js). The recipient has no account yet, so each
// send is filed on the Activity Log against the application. Fire-and-forget
// like the account emails: the application itself has already been saved by the
// time one is sent.
//
// Wording is ours and should be seen by the client.

const BOARD = { boardId: "foster_applications", boardName: "Foster Applications" };

function target(applicationId) {
  return { ...BOARD, itemId: String(applicationId) };
}

export function sendFosterApplicationReceivedEmail({ applicationId, email, firstName, lastName }) {
  return sendOrLog(
    "foster_application_received",
    "Foster application received email",
    {
      to: email,
      subject: "We received your foster application",
      text: `Hi ${firstName},\n\nThanks for applying to foster with Itty Bitty Kitty Tails. We have received your application and will review it. You will get another email once we have made a decision.\n\nIBKT System`,
    },
    { userName: `${firstName} ${lastName}`.trim(), actorName: "Applicant", target: target(applicationId) },
  );
}

// The app's public address plus a path, for links in emails. APP_BASE_URL is
// the address the app is served from, including any sub-path.
function appLink(path) {
  const base = String(process.env.APP_BASE_URL ?? "").trim().replace(/\/+$/, "");

  if (!base) throw new Error("APP_BASE_URL isn't set on this server, so a link can't be made.");

  return `${base}${path}`;
}

function days(ms) {
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

// The email with the first set-password link. `kind` tells a first link
// (approval) from a replacement (an Admin resent it).
export async function sendFosterLinkEmail({ kind, applicationId, userId, email, firstName, lastName, code, expiresAt, actor }) {
  const name = `${firstName} ${lastName}`.trim();
  let setUrl;
  let loginUrl;

  try {
    setUrl = appLink(`/foster/set-password?code=${encodeURIComponent(code)}`);
    loginUrl = appLink("/foster/login");
  } catch (err) {
    return { status: "failed", error: err.message };
  }

  const validDays = days(expiresAt - Date.now());
  const approved = kind === "approved";

  return sendOrLog(
    approved ? "foster_approved" : "foster_link_resent",
    approved ? "Foster approved email" : "Foster set-password link email",
    {
      to: email,
      subject: approved ? "Your foster application has been approved" : "Your IBKT sign-in link",
      text: approved
        ? `Hi ${firstName},\n\nGood news - your application to foster with Itty Bitty Kitty Tails has been approved.\n\nTo get started, choose a password here (the link works for ${validDays} days):\n${setUrl}\n\nAfter that you can sign in at:\n${loginUrl}\n\nOnce signed in you will see the cats that IBKT has placed with you.\n\nIBKT System`
        : `Hi ${firstName},\n\nHere is a new link to choose your IBKT password (it works for ${validDays} days):\n${setUrl}\n\nAfter that you can sign in at:\n${loginUrl}\n\nIBKT System`,
    },
    {
      userName: name,
      actorId: actor?.id,
      actorName: actor?.name,
      target: applicationId ? target(applicationId) : { boardId: USERS.BOARD_ID, boardName: "Users", itemId: String(userId) },
    },
  );
}

export function sendFosterRejectedEmail({ applicationId, email, firstName, lastName, reason, actor }) {
  return sendOrLog(
    "foster_rejected",
    "Foster rejected email",
    {
      to: email,
      subject: "About your foster application",
      text: `Hi ${firstName},\n\nThank you for applying to foster with Itty Bitty Kitty Tails. After reviewing your application we are not able to approve it at this time.\n\n${reason}\n\nYou are welcome to apply again in the future.\n\nIBKT System`,
    },
    { userName: `${firstName} ${lastName}`.trim(), actorId: actor?.id, actorName: actor?.name, target: target(applicationId) },
  );
}
