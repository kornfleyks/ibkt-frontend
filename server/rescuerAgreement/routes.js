import { isDatabaseEnabled } from "../database/db.js";
import { actorOf } from "../database/boardRecords.js";
import { handle, PortalError } from "../rescuerPortal/routes.js";
import { getSubmission } from "../wixRescuerForm/store.js";
import { sendRescuerAgreementEmail, sendRescuerSignedEmail } from "../mail/rescuerAgreementEmails.js";
import { AGREEMENT, agreementFileHash, agreementLinkMs, signupLinkMs } from "./config.js";
import { issueAgreement, recordEmail, findOpenAgreement, signAgreement, reissueSignup, findOpenSignup } from "./store.js";

// The Rescuer Agreement (docs/rescuer-agreement.md). After the call, Mia
// approves a Wix rescuer request in Oriel, and the person gets a link to the
// agreement. Signing it makes a link to sign up to Oriel.
//
// Admin (the Rescuers page):
//   POST /api/wix-rescuer-submissions/:id/agreement    approves: makes the agreement link and emails it
//        (again for a request not signed yet: a new link, the old one stops working)
//   POST /api/wix-rescuer-submissions/:id/signup-link  a new sign-up link, emailed, for a signed
//        agreement whose sign-up link was not used
//   both -> { ok, expiresAt, email: { status, error? } }
//
// Public (the code in the address is the only credential):
//   GET  /api/public/rescuer-agreements/:code          -> { firstName, version, date, file, points, expiresAt }
//   POST /api/public/rescuer-agreements/:code/sign     { typedName, points: [ids] } -> { ok, signupCode }
//   GET  /api/public/rescuer-agreements/signup/:code   -> { firstName, lastName, email } of the sign-up link
//
// How long the links work is set by RESCUER_AGREEMENT_LINK_DAYS and
// RESCUER_SIGNUP_LINK_DAYS (config.js). The sign-up link is used up by the
// application (rescuerOnboarding/routes.js).

const CODE_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const GONE = "This link has expired or has already been used. Ask for a new one.";
const MAX_NAME = 255;

function requireDatabase(req, res, next) {
  if (isDatabaseEnabled()) return next();

  res.status(503).json({ error: "The agreement isn't open on this server yet." });
}

function validCode(req, res, next) {
  if (CODE_PATTERN.test(String(req.params.code))) return next();

  res.status(404).json({ error: GONE });
}

// The request row of the :id, with an email, or throws.
async function requestOf(req) {
  if (!/^\d{1,18}$/.test(req.params.id)) throw new PortalError("Request not found.", 404);

  const row = await getSubmission(req.params.id);

  if (!row) throw new PortalError("Request not found.", 404);
  if (!row.email) throw new PortalError("This request has no email address.", 400);

  const parts = String(row.full_name ?? "").trim().split(/\s+/).filter(Boolean);

  return {
    id: String(row.id),
    email: row.email,
    firstName: row.first_name || parts[0] || null,
    lastName: row.last_name || parts.slice(1).join(" ") || null,
  };
}

function agreementPoint(id) {
  return AGREEMENT.points.find((point) => point.id === id);
}

export function registerRescuerAgreementRoutes(app, { requireAuth, requireAdmin }) {
  app.post("/api/wix-rescuer-submissions/:id/agreement", requireAuth, requireAdmin, requireDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const person = await requestOf(req);
        const issued = await issueAgreement({
          submissionId: person.id,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          ttlMs: agreementLinkMs(),
          createdById: req.user.sub,
          createdByName: `${req.user.firstName} ${req.user.lastName}`.trim(),
        });

        if (!issued) throw new PortalError("This person has already signed the agreement.", 409);

        const sent = await sendRescuerAgreementEmail({
          agreementId: issued.id,
          email: person.email,
          firstName: person.firstName,
          code: issued.code,
          expiresAt: issued.expiresAt,
          actor: actorOf(req),
        });

        await recordEmail(issued.id, sent);

        return { ok: true, expiresAt: issued.expiresAt, email: { status: sent.status, error: sent.error } };
      },
      "rescuer agreement approval",
    ),
  );

  app.post("/api/wix-rescuer-submissions/:id/signup-link", requireAuth, requireAdmin, requireDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const person = await requestOf(req);
        const issued = await reissueSignup(person.id, signupLinkMs());

        if (!issued) throw new PortalError("A sign-up link can only be sent after the agreement is signed, and until the person has signed up.", 409);

        const { agreement } = issued;
        const sent = await sendRescuerSignedEmail({
          agreementId: agreement.id,
          email: agreement.email,
          firstName: agreement.firstName,
          signupCode: issued.code,
          signupExpiresAt: issued.expiresAt,
          resend: true,
          actor: actorOf(req),
        });

        await recordEmail(agreement.id, sent);

        return { ok: true, expiresAt: issued.expiresAt, email: { status: sent.status, error: sent.error } };
      },
      "rescuer sign-up link",
    ),
  );

  app.get("/api/public/rescuer-agreements/signup/:code", validCode, requireDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const agreement = await findOpenSignup(req.params.code);

        if (!agreement) throw new PortalError(GONE, 404);

        return { firstName: agreement.firstName, lastName: agreement.lastName, email: agreement.email };
      },
      "rescuer sign-up link check",
    ),
  );

  app.get("/api/public/rescuer-agreements/:code", validCode, requireDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const agreement = await findOpenAgreement(req.params.code);

        if (!agreement) throw new PortalError(GONE, 404);

        return {
          firstName: agreement.firstName,
          version: AGREEMENT.version,
          date: AGREEMENT.date,
          file: AGREEMENT.file,
          points: AGREEMENT.points,
          expiresAt: agreement.expiresAt,
        };
      },
      "rescuer agreement check",
    ),
  );

  app.post("/api/public/rescuer-agreements/:code/sign", validCode, requireDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const typedName = typeof req.body?.typedName === "string" ? req.body.typedName.replace(/\s+/g, " ").trim() : "";
        const ids = Array.isArray(req.body?.points) ? [...new Set(req.body.points)] : [];

        if (typedName.length < 2) throw new PortalError("Type your full name to sign.", 400);
        if (typedName.length > MAX_NAME) throw new PortalError("The name is too long.", 400);
        if (ids.length === 0) throw new PortalError("Tick at least one point to sign.", 400);
        if (!ids.every((id) => typeof id === "string" && agreementPoint(id))) throw new PortalError("Some of the points are not part of this agreement.", 400);

        // The text of each ticked point is kept with the signature.
        const points = ids.map((id) => agreementPoint(id));
        const signed = await signAgreement(req.params.code, {
          signedName: typedName,
          version: AGREEMENT.version,
          fileHash: agreementFileHash(),
          points,
          signupTtlMs: signupLinkMs(),
        });

        if (!signed) throw new PortalError(GONE, 404);

        const { agreement, signupCode, signupExpiresAt } = signed;
        const sent = await sendRescuerSignedEmail({
          agreementId: agreement.id,
          email: agreement.email,
          firstName: agreement.firstName,
          signedName: typedName,
          version: AGREEMENT.version,
          signedAt: agreement.signedAt,
          points,
          signupCode,
          signupExpiresAt,
          actor: { id: `agreement-${agreement.id}`, name: typedName },
        });

        await recordEmail(agreement.id, sent).catch((err) => console.error("Rescuer agreement: couldn't record the email.", err.message));

        // The page opens the sign-up with this code, so a failed email does not stop the person.
        return { ok: true, signupCode };
      },
      "rescuer agreement signature",
    ),
  );
}
