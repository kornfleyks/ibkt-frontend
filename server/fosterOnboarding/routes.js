import { FOSTER_FORM_ID, WORDING_VERSION, fosterAnswersErrors, cleanFosterAnswers } from "../../src/constants/forms/fosterApplicationForm.js";
import { NOTIFICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/notificationsStatuses.js";
import { USERS } from "../../src/constants/boards/users.js";
import { ROLES, isAdminRole } from "../../src/constants/roles.js";
import { getUserDirectory } from "../auth.js";
import { logActivity } from "../activityLog.js";
import { createNotification } from "../notifications.js";
import { isDatabaseEnabled } from "../database/db.js";
import { isDatabaseBoard } from "../database/switches.js";
import { StoreError } from "../database/boardStore.js";
import { actorOf } from "../database/boardRecords.js";
import { userById } from "../database/usersStore.js";
import { sendFosterApplicationReceivedEmail, sendFosterLinkEmail, sendFosterRejectedEmail } from "../mail/fosterEmails.js";
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
import { createFosterAccount, issueSetPasswordLink, ApprovalError } from "./approval.js";

// Foster onboarding (docs/foster-onboarding.md), the same flow as the rescuer
// onboarding (rescuerOnboarding/routes.js).
//
// Public (no sign-in):
//   POST /api/public/foster-applications   { answers, website }
//
// Admin (the Applications tab and Add Foster on the Fosters page):
//   GET  /api/foster-applications[?status=]
//   GET  /api/foster-applications/:id
//   POST /api/foster-applications/:id/approve
//   POST /api/foster-applications/:id/reject     { reason }
//   POST /api/admin/fosters                      { firstName, lastName, email, ... }
//   POST /api/admin/fosters/:userId/resend-link
//
// The public route is open to anyone, so: a hidden "website" field that people
// leave empty and bots fill in, a cap on applications per address per hour, and
// one answer for every outcome - the reply never says whether the email already
// has an application or an account, and a bot gets the same "ok" a person does.

const MAX_PER_IP_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["Pending", "Approved", "Rejected"];
const MAX_REASON = 1000;
const TARGET_BOARD = "foster_applications";
const APPLICANT = { id: "applicant", name: "Foster application" };

function reply(res, err, what) {
  if (err instanceof ApprovalError) return res.status(err.status).json({ error: err.message });
  if (err instanceof StoreError) return res.status(err.status ?? 500).json({ error: err.message });
  if (err?.rateLimited) return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });

  console.error(`Foster onboarding: failed to ${what}:`, err);
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
        type: NOTIFICATIONS_STATUS_OPTIONS.TYPE.FOSTER_APPLICATION,
        message: `New foster application from ${name}`,
        actor: APPLICANT,
        target: { boardId: TARGET_BOARD, itemId: id, name },
        link: "/fosters?tab=applications",
      });
    }
  } catch (err) {
    console.error("Foster application: couldn't notify the Admins.", err.message);
  }
}

function logDecision({ actor, application, actionType, verb }) {
  const name = `${application.firstName} ${application.lastName}`.trim();

  logActivity({
    actorId: actor.id,
    actorName: actor.name,
    boardId: TARGET_BOARD,
    boardName: "Foster Applications",
    itemId: application.id,
    itemName: name,
    actionType,
    description: `${actor.name} ${verb} the foster application from ${name}`,
  });
}

// "YYYY-MM-DD" of a date or a date string, or "" when there is none.
function dayText(value) {
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function phoneText(phone) {
  const number = String(phone?.number ?? "").trim();

  return number ? `${number}${phone?.country ? ` (${phone.country})` : ""}` : "";
}

// What an application tells us about the person, as createFosterAccount wants
// it: the address, the emergency contact and the references as text for the
// Fosters board, and anything the reviewer should notice in the notes.
export function personFromApplication(application) {
  const a = application.answers ?? {};
  const address = [a.addressLine1, a.addressLine2, a.city, a.region, a.postcode, a.country].filter(Boolean).join(", ");
  const emergencyContact = [
    [a.emergencyName, a.emergencyRelationship && `(${a.emergencyRelationship})`].filter(Boolean).join(" "),
    phoneText(a.emergencyPhone),
    a.emergencyEmail,
    a.emergencyAddress,
  ]
    .filter(Boolean)
    .join("\n");
  const references = [1, 2, 3]
    .map((n) => {
      const detail = [a[`ref${n}Relationship`] && `(${a[`ref${n}Relationship`]})`, phoneText(a[`ref${n}Phone`]), a[`ref${n}Email`]].filter(Boolean).join(", ");

      return `${n}. ${a[`ref${n}Name`] ?? ""} ${detail}`.trim();
    })
    .join("\n");
  const notes = [
    a.residentPets === "No" && "Applicant answered No to: resident pets are vaccinated and neutered/spayed.",
    a.disagreement === "Yes" && `Applicant reported a dispute with a rescue or rehoming independently: ${a.disagreementDetails ?? ""}`,
    a.typedName && `Declaration signed by ${a.typedName} (typed) on ${dayText(application.submittedAt) || "the day it was sent"}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    firstName: application.firstName,
    lastName: application.lastName,
    email: application.email,
    phone: a.phone,
    country: a.country,
    city: a.city,
    address,
    emergencyContact,
    references,
    notes,
    // The form only submits with every statement answered Yes.
    consents: true,
  };
}

function requireFosterBoards(req, res, next) {
  if (isDatabaseBoard("fosters") && isDatabaseBoard("users")) return next();

  res.status(409).json({ error: "Fosters are still kept on Monday on this server. Add fosters to DATABASE_BOARDS to use them." });
}

export function registerFosterOnboardingRoutes(app, { requireAuth, requireAdmin }) {
  app.post("/api/public/foster-applications", async (req, res) => {
    if (!isDatabaseEnabled()) {
      return res.status(503).json({ error: "Applications aren't open on this server yet." });
    }

    // A bot filled in the hidden field: pretend it worked, save nothing.
    if (req.body?.website) return res.json({ ok: true });

    const answers = req.body?.answers;

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({ error: "The form answers are missing." });
    }

    const errors = fosterAnswersErrors(answers);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Some answers are missing or invalid.", fields: errors });
    }

    try {
      const ipHash = hashIp(req.ip);

      if ((await countRecentFromIp(ipHash, HOUR_MS)) >= MAX_PER_IP_PER_HOUR) {
        return res.status(429).json({ error: "Too many applications from this connection. Please try again later." });
      }

      const clean = cleanFosterAnswers(answers);
      const saved = await insertApplication({
        firstName: clean.firstName.slice(0, 255),
        lastName: clean.lastName.slice(0, 255),
        email: clean.email.slice(0, 320),
        answers: { formId: FOSTER_FORM_ID, ...clean },
        wordingVersion: WORDING_VERSION,
        ipHash,
      });

      // Already Pending or Approved for this email: nothing saved, nothing
      // emailed, and the person is told the same as everyone else.
      if (saved) {
        sendFosterApplicationReceivedEmail({ applicationId: saved.id, email: clean.email, firstName: clean.firstName, lastName: clean.lastName });
        notifyAdminsOfApplication({ id: saved.id, firstName: clean.firstName, lastName: clean.lastName });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("Foster application failed:", err);
      res.status(500).json({ error: "Failed to send your application. Please try again." });
    }
  });

  // ?status=Pending|Approved|Rejected (default: all)
  app.get("/api/foster-applications", requireAuth, requireAdmin, async (req, res) => {
    const status = req.query.status;

    if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: "Unknown status." });

    try {
      res.json(await listApplications(status));
    } catch (err) {
      reply(res, err, "load the applications");
    }
  });

  app.get("/api/foster-applications/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const application = await getApplication(req.params.id);

      if (!application) return res.status(404).json({ error: "Application not found." });

      res.json(application);
    } catch (err) {
      reply(res, err, "load the application");
    }
  });

  // Creates the Fosters record and the login, sends the set-password link.
  // Safe to repeat after a failure: what was already made is reused.
  app.post("/api/foster-applications/:id/approve", requireAuth, requireAdmin, requireFosterBoards, async (req, res) => {
    const actor = actorOf(req);
    let claimed = false;

    try {
      const application = await getApplication(req.params.id);

      if (!application) return res.status(404).json({ error: "Application not found." });
      if (application.status !== "Pending") return res.status(409).json({ error: `This application is already ${application.status}.` });

      claimed = await claimApplication(application.id);

      if (!claimed) return res.status(409).json({ error: "This application is being processed. Try again in a minute." });

      const { fosterId, userId } = await createFosterAccount(personFromApplication(application), {
        resume: { fosterId: application.fosterId, userId: application.userId },
        onProgress: (progress) => saveProgress(application.id, progress),
      });
      const { code, expiresAt } = await issueSetPasswordLink(userId);

      await markDecided(application.id, { status: "Approved", reviewer: actor });
      claimed = false;
      logDecision({ actor, application, actionType: "Approved", verb: "approved" });

      const email = await sendFosterLinkEmail({
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

      res.json({ ok: true, fosterId, userId, email });
    } catch (err) {
      if (claimed) await releaseApplication(req.params.id).catch(() => {});
      reply(res, err, "approve the application");
    }
  });

  // Body: { reason } - included in the rejection email.
  app.post("/api/foster-applications/:id/reject", requireAuth, requireAdmin, async (req, res) => {
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

      const email = await sendFosterRejectedEmail({
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

  // "Add Foster": an Admin creates a foster directly (no form, no review).
  app.post("/api/admin/fosters", requireAuth, requireAdmin, requireFosterBoards, async (req, res) => {
    const actor = actorOf(req);
    const body = req.body ?? {};
    const text = (value) => (typeof value === "string" ? value.trim() : "");
    const person = {
      firstName: text(body.firstName),
      lastName: text(body.lastName),
      email: text(body.email),
      phone: body.phone,
      country: text(body.country),
      city: text(body.city),
      address: text(body.address),
      notes: text(body.notes),
      // An Admin adding someone has no answers from them, so no agreement.
      consents: false,
    };

    if (!person.firstName || !person.lastName || !person.email) {
      return res.status(400).json({ error: "First name, last name and email are required." });
    }

    if (!EMAIL_PATTERN.test(person.email)) return res.status(400).json({ error: "Enter a valid email address." });

    try {
      const { fosterId, userId } = await createFosterAccount(person);
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
        description: `${actor.name} added ${fullName} as a foster`,
      });

      const email = await sendFosterLinkEmail({
        kind: "approved",
        userId,
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        code,
        expiresAt,
        actor,
      });

      res.json({ ok: true, fosterId, userId, email });
    } catch (err) {
      reply(res, err, "add the foster");
    }
  });

  // A fresh set-password link, e.g. when the first one expired unused.
  app.post("/api/admin/fosters/:userId/resend-link", requireAuth, requireAdmin, requireFosterBoards, async (req, res) => {
    const actor = actorOf(req);

    try {
      const user = await userById(req.params.userId);

      if (!user || user.role !== ROLES.FOSTER) return res.status(404).json({ error: "Foster not found." });
      if (user.accountStatus !== "Active") return res.status(409).json({ error: "Only an Active foster can be sent a link." });

      const { code, expiresAt } = await issueSetPasswordLink(user.id);
      const email = await sendFosterLinkEmail({
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
