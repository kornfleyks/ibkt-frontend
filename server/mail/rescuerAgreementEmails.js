import { sendOrLog } from "./accountEmails.js";
import { emailName } from "./emailText.js";
import { appLink } from "./rescuerEmails.js";

// The emails of the Rescuer Agreement (server/rescuerAgreement/routes.js).
// The recipient has no account yet, so each send is filed on the Activity Log
// against the agreement. Each resolves to { status, error? } like the other
// emails and never throws.
//
// Wording is a draft for the client to approve.

const DAY_MS = 24 * 60 * 60 * 1000;
const days = (expiresAt) => Math.max(1, Math.round((new Date(expiresAt) - Date.now()) / DAY_MS));
const target = (agreementId) => ({ boardId: "rescuer_agreements", boardName: "Rescuer Agreements", itemId: String(agreementId) });
const dateText = (date) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function linkOrFailure(path) {
  try {
    return { url: appLink(path) };
  } catch (err) {
    return { failure: { status: "failed", error: err.message } };
  }
}

// The link to read and sign the agreement, sent when Mia approves.
export async function sendRescuerAgreementEmail({ agreementId, email, firstName, code, expiresAt, actor }) {
  const { url, failure } = linkOrFailure(`/rescuer-agreement/${encodeURIComponent(code)}`);

  if (failure) return failure;

  return sendOrLog(
    "rescuer_agreement",
    "Rescuer Agreement email",
    {
      to: email,
      subject: "Please sign your Rescuer Agreement",
      text: `Hi ${emailName(firstName)},\n\nThank you for speaking with us. The next step is to read and sign the Rescuer Agreement.\n\nOpen the agreement here (the link works for ${days(expiresAt)} days and can be used once):\n${url}\n\nAfter you sign it, we will email you a link to sign up to Oriel.\n\nOriel`,
    },
    { userName: emailName(firstName), actorId: actor?.id, actorName: actor?.name, target: target(agreementId) },
  );
}

// The signed copy and the link to sign up to Oriel, sent when the agreement is
// signed. `resend` is true when an Admin sends a new sign-up link later: then
// the email is only the link.
export async function sendRescuerSignedEmail({ agreementId, email, firstName, signedName, version, signedAt, points, signupCode, signupExpiresAt, resend = false, actor }) {
  const { url, failure } = linkOrFailure(`/become-a-rescuer/${encodeURIComponent(signupCode)}`);

  if (failure) return failure;

  const linkText = `Sign up to Oriel here (the link works for ${days(signupExpiresAt)} days and can be used once):\n${url}`;
  const text = resend
    ? `Hi ${emailName(firstName)},\n\nHere is a new link to sign up to Oriel.\n\n${linkText}\n\nOriel`
    : `Hi ${emailName(firstName)},\n\nThank you for signing the Rescuer Agreement. This is your copy.\n\nAgreement version: ${version}\nSigned by: ${emailName(signedName, 255)}\nSigned on: ${dateText(signedAt)}\n\nYou agreed to:\n${points.map((point) => `- ${point.text}`).join("\n")}\n\nNext, ${linkText.charAt(0).toLowerCase()}${linkText.slice(1)}\n\nOriel`;

  return sendOrLog(
    resend ? "rescuer_signup_link" : "rescuer_agreement_signed",
    resend ? "Rescuer sign-up link email" : "Rescuer Agreement signed email",
    { to: email, subject: resend ? "Your link to sign up to Oriel" : "Your signed Rescuer Agreement", text },
    { userName: emailName(firstName), actorId: actor?.id, actorName: actor?.name, target: target(agreementId) },
  );
}
