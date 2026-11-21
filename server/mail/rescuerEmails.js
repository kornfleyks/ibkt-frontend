import { USERS } from "../../src/constants/boards/users.js";
import { sendOrLog } from "./accountEmails.js";
import { emailName } from "./emailText.js";

// Emails of the rescuer onboarding flow (docs/rescuer-onboarding.md). The
// recipient has no account yet, so each send is filed on the Activity Log
// against the application. Fire-and-forget like the account emails: the
// application itself has already been saved by the time one is sent.
//
// Wording is a draft for the client to approve.

const BOARD = { boardId: "rescuer_applications", boardName: "Rescuer Applications" };

function target(applicationId) {
  return { ...BOARD, itemId: String(applicationId) };
}

export function sendRescuerApplicationReceivedEmail({ applicationId, email, firstName, lastName }) {
  return sendOrLog(
    "rescuer_application_received",
    "Rescuer application received email",
    {
      to: email,
      subject: "We received your rescuer application",
      text: `Hi ${emailName(firstName)},\n\nThanks for applying to become a rescuer with Itty Bitty Kitty Tails. We have received your application and will review it. You will get another email once we have made a decision.\n\nIBKT System`,
    },
    { userName: emailName(`${firstName} ${lastName}`), actorName: "Applicant", target: target(applicationId) },
  );
}

// The app's public address plus a path, for links in emails. APP_BASE_URL is
// the address the app is served from, including any sub-path (for example
// https://kornfleyks.github.io/ibkt-frontend).
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
export async function sendRescuerLinkEmail({ kind, applicationId, userId, email, firstName, lastName, code, expiresAt, actor }) {
  const name = emailName(`${firstName} ${lastName}`);
  let setUrl;
  let loginUrl;

  try {
    setUrl = appLink(`/rescuer/set-password?code=${encodeURIComponent(code)}`);
    loginUrl = appLink("/rescuer/login");
  } catch (err) {
    return { status: "failed", error: err.message };
  }

  const validDays = days(expiresAt - Date.now());
  const approved = kind === "approved";

  return sendOrLog(
    approved ? "rescuer_approved" : "rescuer_link_resent",
    approved ? "Rescuer approved email" : "Rescuer set-password link email",
    {
      to: email,
      subject: approved ? "Your rescuer application has been approved" : "Your IBKT sign-in link",
      text: approved
        ? `Hi ${emailName(firstName)},\n\nGood news - your application to become a rescuer with Itty Bitty Kitty Tails has been approved.\n\nTo get started, choose a password here (the link works for ${validDays} days):\n${setUrl}\n\nAfter that you can sign in at:\n${loginUrl}\n\nOnce signed in you can add the cats you are rehoming and see the ones you have added.\n\nIBKT System`
        : `Hi ${emailName(firstName)},\n\nHere is a new link to choose your IBKT password (it works for ${validDays} days):\n${setUrl}\n\nAfter that you can sign in at:\n${loginUrl}\n\nIBKT System`,
    },
    {
      userName: name,
      actorId: actor?.id,
      actorName: actor?.name,
      target: applicationId ? target(applicationId) : { boardId: USERS.BOARD_ID, boardName: "Users", itemId: String(userId) },
    },
  );
}

export function sendRescuerRejectedEmail({ applicationId, email, firstName, lastName, reason, actor }) {
  return sendOrLog(
    "rescuer_rejected",
    "Rescuer rejected email",
    {
      to: email,
      subject: "About your rescuer application",
      text: `Hi ${emailName(firstName)},\n\nThank you for applying to become a rescuer with Itty Bitty Kitty Tails. After reviewing your application we are not able to approve it at this time.\n\n${reason}\n\nYou are welcome to apply again in the future.\n\nIBKT System`,
    },
    { userName: emailName(`${firstName} ${lastName}`), actorId: actor?.id, actorName: actor?.name, target: target(applicationId) },
  );
}
