import { RESCUER_FORM_ID, WORDING_VERSION, rescuerAnswersErrors, cleanRescuerAnswers } from "../../src/constants/forms/rescuerApplicationForm.js";
import { clientKey } from "../clientAddress.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/notificationsStatuses.js";
import { USERS } from "../../src/constants/boards/users.js";
import { isAdminRole } from "../../src/constants/roles.js";
import { getUserDirectory } from "../auth.js";
import { logActivity } from "../activityLog.js";
import { createNotification } from "../notifications.js";
import { isDatabaseEnabled } from "../database/db.js";
import { isDatabaseBoard } from "../database/switches.js";
import { StoreError } from "../database/boardStore.js";
import { actorOf } from "../database/boardRecords.js";
import { userById } from "../database/usersStore.js";
import { sendRescuerApplicationReceivedEmail, sendRescuerLinkEmail, sendRescuerRejectedEmail } from "../mail/rescuerEmails.js";
import {
  hashIp,
  countRecentFromIp,
  insertApplication,
  listApplications,
  getApplication,
  claimApplication,
  releaseApplication,
  saveProgress,
  markDecided,
} from "./applicationsStore.js";
import { createRescuerAccount, issueSetPasswordLink, ApprovalError } from "./approval.js";
import { claimSignup, releaseSignup } from "../rescuerAgreement/store.js";

// Rescuer onboarding (docs/rescuer-onboarding.md).
//
// Public (no sign-in):
//   POST /api/public/rescuer-applications   { answers, password, website, signupCode }
//     -> { ok, status: "approved" | "pending" }
//     signupCode is the sign-up link the person got after signing the Rescuer
//     Agreement (rescuerAgreement/); without a valid one the answer is 403.
//     The link is used up, and the account is made for the agreement's email.
//     "approved": the account exists and the password works, so the page
//     signs the rescuer in. "pending": the application is saved but the
//     account could not be made (for example the email already has an
//     account), so an Admin finishes it on the Applications tab.
//
// Admin (the Applications tab and Add Rescuer on the Rescuers page):
//   GET  /api/rescuer-applications[?status=]
//   GET  /api/rescuer-applications/:id
//   POST /api/rescuer-applications/:id/approve
//   POST /api/rescuer-applications/:id/reject     { reason }
//   POST /api/admin/rescuers                      { firstName, lastName, email, ... }
//   POST /api/admin/rescuers/:userId/resend-link
//
// The public route is open to anyone, so: a hidden "website" field that
// people leave empty and bots fill in, a cap on applications per address
// per hour, and one answer for every outcome - the reply never says whether
// the email already has an application or an account, and a bot gets the
// same "ok" a person does.

const SIGNUP_CODE_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const SIGNUP_LINK_NEEDED = "You need the sign-up link from your email to apply. If it has expired, ask IBKT for a new one.";
const MAX_PER_IP_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["Pending", "Approved", "Rejected"];
const MAX_REASON = 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const AUTOMATIC_REVIEWER = { id: "automatic", name: "Automatic approval" };
const TARGET_BOARD = "rescuer_applications";
const APPLICANT = { id: "applicant", name: "Rescuer application" };

function reply(res, err, what) {
  if (err instanceof ApprovalError) return res.status(err.status).json({ error: err.message });
  if (err instanceof StoreError) return res.status(err.status ?? 500).json({ error: err.message });
  if (err?.rateLimited) return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });

  console.error(`Rescuer onboarding: failed to ${what}:`, err);
  return res.status(500).json({ error: `Failed to ${what}.` });
}

// Every Active Admin gets a bell notification for a new application. Never
// throws: the application is already saved.
async function notifyAdminsOfApplication({ id, firstName, lastName }) {
  try {
    const name = `${firstName} ${lastName}`.trim();
    const admins = (await getUserDirectory()).filter((user) => isAdminRole(user.role) && user.accountStatus === "Active");

    for (const admin of admins) {
      createNotification({
        recipientId: admin.id,
        type: NOTIFICATIONS_STATUS_OPTIONS.TYPE.RESCUER_APPLICATION,
        message: `New rescuer application from ${name}`,
        actor: APPLICANT,
        target: { boardId: TARGET_BOARD, itemId: id, name },
        link: "/rescuers?tab=applications",
      });
    }
  } catch (err) {
    console.error("Rescuer application: couldn't notify the Admins.", err.message);
  }
}

function logDecision({ actor, application, actionType, verb }) {
  const name = `${application.firstName} ${application.lastName}`.trim();

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: TARGET_BOARD,
    boardName: "Rescuer Applications",
    itemId: application.id,
    itemName: name,
    actionType,
    description: `${actor.name} ${verb} the rescuer application from ${name}`,
  });
}

// What an application tells us about the person, as createRescuerAccount wants it.
function personFromApplication(application) {
  const a = application.answers ?? {};
  const notes = [
    a.catsDescription && `Rescue work: ${a.catsDescription}`,
    a.groupName && `Group or organisation: ${a.groupName}`,
    a.howHeard && `Heard about IBKT: ${a.howHeard}`,
    a.notes && `Applicant notes: ${a.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    phone: a.phone,
    whatsapp: a.whatsapp,
    country: a.country,
    city: a.city,
    contactMethod: a.contactMethod,
    notes,
    // The form only submits with every statement answered Yes.
    consents: true,
  };
}

// Approval without an Admin: a new application becomes a rescuer account
// straight away, with the password the person chose on the form. True when
// the account was made. On any failure the application is left Pending (so
// an Admin can approve or reject it) and this returns false; it never
// throws, because the application is already saved.
async function approveAutomatically(applicationId, password) {
  if (!isDatabaseBoard("rescuers") || !isDatabaseBoard("users")) return false;

  let claimed = false;

  try {
    const application = await getApplication(applicationId);

    claimed = await claimApplication(applicationId);

    if (!claimed) return false;

    await createRescuerAccount(personFromApplication(application), {
      password,
      onProgress: (progress) => saveProgress(applicationId, progress),
    });

    await markDecided(applicationId, { status: "Approved", reviewer: AUTOMATIC_REVIEWER });
    claimed = false;
    logDecision({ actor: AUTOMATIC_REVIEWER, application, actionType: "Approved", verb: "approved" });

    return true;
  } catch (err) {
    if (!(err instanceof ApprovalError)) console.error("Rescuer application: automatic approval failed:", err);

    if (claimed) await releaseApplication(applicationId).catch(() => {});

    return false;
  }
}

function requireRescuerBoards(req, res, next) {
  if (isDatabaseBoard("rescuers") && isDatabaseBoard("users")) return next();

  res.status(409).json({ error: "Rescuers are still kept on Monday on this server." });
}

export function registerRescuerOnboardingRoutes(app, { requireAuth, requireAdmin }) {
  app.post("/api/public/rescuer-applications", async (req, res) => {
    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Applications aren't open on this server yet." });
    }

    // A bot filled in the hidden field: pretend it worked, save nothing.
    if (req.body?.website) return res.json({ ok: true });

    const answers = req.body?.answers;
    const password = req.body?.password;
    const signupCode = req.body?.signupCode;

    // Only a person who signed the Rescuer Agreement has a sign-up link
    // (rescuerAgreement/): the application needs it.
    if (!SIGNUP_CODE_PATTERN.test(String(signupCode))) return res.status(403).json({ error: SIGNUP_LINK_NEEDED });

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({ error: "The form answers are missing." });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const errors = rescuerAnswersErrors(answers);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Some answers are missing or invalid.", fields: errors });
    }

    try {
      const ipHash = hashIp(clientKey(req.ip));

      if ((await countRecentFromIp(ipHash, HOUR_MS)) >= MAX_PER_IP_PER_HOUR) {
        return res.status(429).json({ error: "Too many applications from this connection. Please try again later." });
      }

      // The sign-up link is used up by one application (two at once cannot both win).
      const agreement = await claimSignup(signupCode);

      if (!agreement) return res.status(403).json({ error: SIGNUP_LINK_NEEDED });

      // The account is for the email of the signed agreement, whatever the form says.
      const clean = { ...cleanRescuerAnswers(answers), email: agreement.email };
      let saved;

      try {
        saved = await insertApplication({
          firstName: clean.firstName.slice(0, 255),
          lastName: clean.lastName.slice(0, 255),
          email: clean.email.slice(0, 320),
          answers: { formId: RESCUER_FORM_ID, ...clean },
          wordingVersion: WORDING_VERSION,
          ipHash,
        });
      } catch (err) {
        // Not saved: the person can try again with the same link.
        await releaseSignup(agreement.id).catch(() => {});
        throw err;
      }

      // Already Pending or Approved for this email: nothing saved, nothing
      // emailed, and the person is told their application was received.
      if (!saved) return res.json({ ok: true, status: "pending" });

      if (await approveAutomatically(saved.id, password)) return res.json({ ok: true, status: "approved" });

      // The account could not be made: the application stays Pending for an
      // Admin, who is notified, and the applicant is told it was received.
      sendRescuerApplicationReceivedEmail({ applicationId: saved.id, email: clean.email, firstName: clean.firstName, lastName: clean.lastName });
      notifyAdminsOfApplication({ id: saved.id, firstName: clean.firstName, lastName: clean.lastName });

      res.json({ ok: true, status: "pending" });
    } catch (err) {
      console.error("Rescuer application failed:", err);
      res.status(500).json({ error: "Failed to send your application. Please try again." });
    }
  });

  // ?status=Pending|Approved|Rejected (default: all)
  app.get("/api/rescuer-applications", requireAuth, requireAdmin, async (req, res) => {
    const status = req.query.status;

    if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status." });

    try {
      res.json(await listApplications(status));
    } catch (err) {
      reply(res, err, "load the applications");
    }
  });

  app.get("/api/rescuer-applications/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const application = await getApplication(req.params.id);

      if (!application) return res.status(404).json({ error: "Application not found." });

      res.json(application);
    } catch (err) {
      reply(res, err, "load the application");
    }
  });

  // Creates the Rescuers record and the login, sends the set-password link.
  // Safe to repeat after a failure: what was already made is reused.
  app.post("/api/rescuer-applications/:id/approve", requireAuth, requireAdmin, requireRescuerBoards, async (req, res) => {
    const actor = actorOf(req);
    let claimed = false;

    try {
      const application = await getApplication(req.params.id);

      if (!application) return res.status(404).json({ error: "Application not found." });
      if (application.status !== "Pending") return res.status(409).json({ error: `This application is already ${application.status}.` });

      claimed = await claimApplication(application.id);

      if (!claimed) return res.status(409).json({ error: "This application is being processed. Try again in a minute." });

      const { rescuerId, userId } = await createRescuerAccount(personFromApplication(application), {
        resume: { rescuerId: application.rescuerId, userId: application.userId },
        onProgress: (progress) => saveProgress(application.id, progress),
      });
      const { code, expiresAt } = await issueSetPasswordLink(userId);

      await markDecided(application.id, { status: "Approved", reviewer: actor });
      claimed = false;
      logDecision({ actor, application, actionType: "Approved", verb: "approved" });

      const email = await sendRescuerLinkEmail({
        kind: "approved",
        applicationId: application.id,
        userId,
        email: application.email,
        firstName: application.firstName,
        lastName: application.lastName,
        code,
        expiresAt,
        actor,
      });

      res.json({ ok: true, rescuerId, userId, email });
    } catch (err) {
      if (claimed) await releaseApplication(req.params.id).catch(() => {});
      reply(res, err, "approve the application");
    }
  });

  // Body: { reason } - included in the rejection email.
  app.post("/api/rescuer-applications/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    const actor = actorOf(req);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    let claimed = false;

    if (!reason) return res.status(400).json({ error: "Give a reason - it is included in the email to the applicant." });
    if (reason.length > MAX_REASON) return res.status(400).json({ error: `Keep the reason under ${MAX_REASON} characters.` });

    try {
      const application = await getApplication(req.params.id);

      if (!application) return res.status(404).json({ error: "Application not found." });
      if (application.status !== "Pending") return res.status(409).json({ error: `This application is already ${application.status}.` });

      claimed = await claimApplication(application.id);

      if (!claimed) return res.status(409).json({ error: "This application is being processed. Try again in a minute." });

      await markDecided(application.id, { status: "Rejected", reviewer: actor, rejectReason: reason });
      claimed = false;
      logDecision({ actor, application, actionType: "Rejected", verb: "rejected" });

      const email = await sendRescuerRejectedEmail({
        applicationId: application.id,
        email: application.email,
        firstName: application.firstName,
        lastName: application.lastName,
        reason,
        actor,
      });

      res.json({ ok: true, email });
    } catch (err) {
      if (claimed) await releaseApplication(req.params.id).catch(() => {});
      reply(res, err, "reject the application");
    }
  });

  // "Add Rescuer": an Admin creates a rescuer directly (no form, no review).
  app.post("/api/admin/rescuers", requireAuth, requireAdmin, requireRescuerBoards, async (req, res) => {
    const actor = actorOf(req);
    const body = req.body ?? {};
    const text = (value) => (typeof value === "string" ? value.trim() : "");
    const person = {
      firstName: text(body.firstName),
      lastName: text(body.lastName),
      email: text(body.email),
      phone: body.phone,
      whatsapp: text(body.whatsapp),
      country: text(body.country),
      city: text(body.city),
      contactMethod: text(body.contactMethod),
      notes: text(body.notes),
      // An Admin adding someone has no answers from them, so no consents.
      consents: false,
    };

    if (!person.firstName || !person.lastName || !person.email) {
      return res.status(400).json({ error: "First name, last name and email are required." });
    }

    if (!EMAIL_PATTERN.test(person.email)) return res.status(400).json({ error: "Enter a valid email address." });

    try {
      const { rescuerId, userId } = await createRescuerAccount(person);
      const { code, expiresAt } = await issueSetPasswordLink(userId);
      const fullName = `${person.firstName} ${person.lastName}`.trim();

      logActivity({
        actorId: actor.id,
        actorName: actor.name,
        boardId: USERS.BOARD_ID,
        boardName: "Users",
        itemId: userId,
        itemName: fullName,
        actionType: "Created",
        description: `${actor.name} added ${fullName} as a rescuer`,
      });

      const email = await sendRescuerLinkEmail({
        kind: "approved",
        userId,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        code,
        expiresAt,
        actor,
      });

      res.json({ ok: true, rescuerId, userId, email });
    } catch (err) {
      reply(res, err, "add the rescuer");
    }
  });

  // A fresh set-password link, e.g. when the first one expired unused.
  app.post("/api/admin/rescuers/:userId/resend-link", requireAuth, requireAdmin, requireRescuerBoards, async (req, res) => {
    const actor = actorOf(req);

    try {
      const user = await userById(req.params.userId);

      if (!user || user.role !== "Rescuer") return res.status(404).json({ error: "Rescuer not found." });
      if (user.accountStatus !== "Active") return res.status(409).json({ error: "Only an Active rescuer can be sent a link." });

      const { code, expiresAt } = await issueSetPasswordLink(user.id);
      const email = await sendRescuerLinkEmail({
        kind: "resent",
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        code,
        expiresAt,
        actor,
      });

      res.json({ ok: true, email });
    } catch (err) {
      reply(res, err, "send the link");
    }
  });
}
