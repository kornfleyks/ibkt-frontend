import { sendOrLog } from "./accountEmails.js";
import { emailName } from "./emailText.js";
import { appLink } from "./rescuerEmails.js";

// The email that invites someone to fill in the Add Cat form (server/
// catShareLinks/routes.js). The recipient has no account, so the send is
// filed on the Activity Log against the invitation. The sender's name is
// written into the email, so it is shortened like any name (emailName).
//
// Wording is a draft for the client to approve.

function days(ms) {
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

// Resolves to { status, error? } like the other emails; never throws.
export async function sendCatInviteEmail({ linkId, email, fullName, senderName, code, expiresAt, actor }) {
  let url;

  try {
    url = appLink(`/add-cat/${encodeURIComponent(code)}`);
  } catch (err) {
    return { status: "failed", error: err.message };
  }

  const validDays = days(expiresAt - Date.now());
  const sender = emailName(senderName) || "Itty Bitty Kitty Tails";

  return sendOrLog(
    "cat_invitation",
    "Add Cat invitation email",
    {
      to: email,
      subject: "Please tell us about a cat",
      text: `Hi ${emailName(fullName)},\n\n${sender} has asked you to fill in a form about a cat that Itty Bitty Kitty Tails will help to rehome.\n\nOpen the form here (the link works for ${validDays} days and for one cat only):\n${url}\n\nIf the link has expired, ask ${sender} to send you a new one.\n\nOriel`,
    },
    {
      userName: emailName(fullName),
      actorId: actor?.id,
      actorName: actor?.name,
      target: { boardId: "cat_share_links", boardName: "Add Cat Invitations", itemId: String(linkId) },
    },
  );
}
