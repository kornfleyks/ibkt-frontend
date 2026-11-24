import { isAdminRole, ROLES } from "../../src/constants/roles.js";
import { CATS } from "../../src/constants/boards/cats.js";
import { NEW_CATS_PER_DAY } from "../../src/constants/rescuerPortal.js";
import { optionLabels } from "../database/boardRecords.js";
import { createCatFromInput, getCat } from "../cats.js";
import { logActivity } from "../activityLog.js";
import { FOSTERS_STATUS_OPTIONS } from "../../src/constants/statuses/fostersStatuses.js";
import { toPhoneValue } from "../phoneValue.js";
import { findFosterByEmail, createUnregisteredFoster } from "./fosters.js";
import { PORTAL_FIELDS, PortalError, handle, myRescuerId, onlyInDatabase, storeCatFile, upload, cleanCatInput } from "../rescuerPortal/routes.js";
import { sendCatInviteEmail } from "../mail/catInviteEmails.js";
import { actorOf } from "../database/boardRecords.js";
import { countRecentLinks, createLink, findOpenLink, claimLink, releaseLink, saveCat, findLinkForUploads, INVITE_TTL_MS } from "./store.js";

// Shareable Add Cat links. A rescuer, Admin or Super Admin makes a link,
// sends it to someone, and that person fills in the Add Cat form without
// signing in. Each link works for one cat and expires after 7 days.
//
// Signed in (Rescuer, Admin, Super Admin):
//   POST /api/cat-share-links                       { audience: "foster" | "rescuer" } -> { code, expiresAt }
//   POST /api/cat-share-links/invitations           { fullName, email, audience } -> { ok, email: { status, error? } }
//     makes a link that expires after 3 days and emails it to the person;
//     the invitation keeps who sent it and who it was sent to
//
// Public (the code in the address is the only credential):
//   GET  /api/public/cat-share-links/:code          -> { expiresAt, audience, breed, colour }
//   POST /api/public/cat-share-links/:code/foster-lookup  { email } -> { found, eligible }
//   POST /api/public/cat-share-links/:code/cats     { name, ...Add Cat fields, foster? } -> { id, name }
//   POST /api/public/cat-share-links/:code/files    multipart { kind, file }
//
// The cat is made Intake and linked to the rescuer who made the link (no
// rescuer when an Admin made it). On a link made for a foster, the person is
// asked who they are: an Active foster with that email is linked to the cat;
// someone not in our records is added to the Fosters table as "Not yet
// registered" (name, surname, email, phone) and linked. The same code may
// upload files to that cat for an hour after it was made, and to no other cat.

const DAY_MS = 24 * 60 * 60 * 1000;
const CODE_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;
const GONE = "This link has expired or has already been used. Ask for a new one.";
const AUDIENCES = ["foster", "rescuer"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 255;
const FOSTER_STATUS = FOSTERS_STATUS_OPTIONS.STATUS;
// A foster record a cat may be linked to: Active, or added from a link and
// not registered yet.
const LINKABLE_FOSTER_STATUSES = [FOSTER_STATUS.ACTIVE, FOSTER_STATUS.NOT_YET_REGISTERED];

// Who a foster link's person is: { fosterId } for a record that exists (it
// must be linkable), or the new "Not yet registered" record made from the
// details they typed. Everything is checked before anything is created.
async function fosterForCat(body) {
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!EMAIL_PATTERN.test(email) || email.length > 320) throw new PortalError("Enter the foster's email address.", 400);

  const found = await findFosterByEmail(email);

  if (found) {
    if (!LINKABLE_FOSTER_STATUSES.includes(found.status)) {
      throw new PortalError("We found a foster record for this email, but it isn't active. Please contact IBKT.", 409);
    }

    return { fosterId: found.id };
  }

  const text = (value) => (typeof value === "string" ? value.trim() : "");
  const person = { firstName: text(body.firstName), lastName: text(body.lastName), email, phone: body.phone };

  if (!person.firstName || !person.lastName) throw new PortalError("Enter your first name and surname.", 400);
  if (person.firstName.length > MAX_TEXT || person.lastName.length > MAX_TEXT) throw new PortalError("The name is too long.", 400);

  const phone = toPhoneValue(person.phone);

  if (phone.error) throw new PortalError(phone.error, 400);
  if (!phone.value?.phone) throw new PortalError("Enter your phone number.", 400);

  return { newPerson: person };
}


function mayMakeLinks(req, res, next) {
  const role = req.user?.role;

  if (role === ROLES.RESCUER || isAdminRole(role)) return next();

  res.status(403).json({ error: "You can't create shareable links." });
}

function validCode(req, res, next) {
  if (CODE_PATTERN.test(String(req.params.code))) return next();

  res.status(404).json({ error: GONE });
}

function actorOfLink(link) {
  return { id: `shared-link-${link.id}`, name: `Shared link from ${link.createdByName}` };
}

export function registerCatShareLinkRoutes(app, { requireAnyAuth }) {
  app.post("/api/cat-share-links", requireAnyAuth, mayMakeLinks, onlyInDatabase, (req, res) =>
    handle(
      res,
      async () => {
        if ((await countRecentLinks(req.user.sub, DAY_MS)) >= NEW_CATS_PER_DAY) {
          throw new PortalError(`You can create up to ${NEW_CATS_PER_DAY} links a day.`, 429);
        }

        const audience = req.body?.audience;

        if (!AUDIENCES.includes(audience)) throw new PortalError("audience must be foster or rescuer.", 400);

        const rescuerId = req.user.role === ROLES.RESCUER ? await myRescuerId(req) : null;
        const { code, expiresAt } = await createLink({
          createdById: req.user.sub,
          createdByName: `${req.user.firstName} ${req.user.lastName}`.trim(),
          rescuerId,
          audience,
        });

        return { code, expiresAt };
      },
      "cat share link request",
    ),
  );

  // The dashboard's "Invite to Add Cat": a link emailed to someone. `email.status`
  // is "sent", "skipped" (the mail service is not set up) or "failed"; the
  // link exists either way, and sending the invitation again makes a new one.
  app.post("/api/cat-share-links/invitations", requireAnyAuth, mayMakeLinks, onlyInDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const text = (value) => (typeof value === "string" ? value.trim() : "");
        const fullName = text(req.body?.fullName);
        const email = text(req.body?.email);
        const audience = req.body?.audience;

        if (!fullName) throw new PortalError("Enter the person's full name.", 400);
        if (fullName.length > MAX_TEXT) throw new PortalError("The name is too long.", 400);
        if (!EMAIL_PATTERN.test(email) || email.length > 320) throw new PortalError("Enter a valid email address.", 400);
        if (!AUDIENCES.includes(audience)) throw new PortalError("audience must be foster or rescuer.", 400);

        if ((await countRecentLinks(req.user.sub, DAY_MS)) >= NEW_CATS_PER_DAY) {
          throw new PortalError(`You can send up to ${NEW_CATS_PER_DAY} links a day.`, 429);
        }

        const senderName = `${req.user.firstName} ${req.user.lastName}`.trim();
        const rescuerId = req.user.role === ROLES.RESCUER ? await myRescuerId(req) : null;
        const { id, code, expiresAt } = await createLink({
          createdById: req.user.sub,
          createdByName: senderName,
          rescuerId,
          audience,
          ttlMs: INVITE_TTL_MS,
          inviteeName: fullName,
          inviteeEmail: email,
        });
        const sent = await sendCatInviteEmail({ linkId: id, email, fullName, senderName, code, expiresAt, actor: actorOf(req) });

        return { ok: true, email: { status: sent.status, error: sent.error } };
      },
      "cat share link request",
    ),
  );

  app.get("/api/public/cat-share-links/:code", validCode, onlyInDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const link = await findOpenLink(req.params.code);

        if (!link) throw new PortalError(GONE, 404);

        const [breed, colour] = await Promise.all([optionLabels("cats", CATS.COLUMNS.BREED), optionLabels("cats", CATS.COLUMNS.COLOUR)]);

        return { expiresAt: link.expiresAt, audience: link.audience, breed, colour };
      },
      "cat share link request",
    ),
  );

  // Tells the page whether the email is one of our fosters, nothing more:
  // never a name or any other detail. `eligible` is false for a record that
  // exists but cannot be given a cat (not Active).
  app.post("/api/public/cat-share-links/:code/foster-lookup", validCode, onlyInDatabase, (req, res) =>
    handle(
      res,
      async () => {
        const link = await findOpenLink(req.params.code);

        if (!link) throw new PortalError(GONE, 404);
        if (link.audience !== "foster") throw new PortalError("This link isn't for a foster.", 400);

        const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";

        if (!EMAIL_PATTERN.test(email) || email.length > 320) throw new PortalError("Enter a valid email address.", 400);

        const found = await findFosterByEmail(email);

        return { found: Boolean(found), eligible: found ? LINKABLE_FOSTER_STATUSES.includes(found.status) : true };
      },
      "cat share link request",
    ),
  );

  app.post("/api/public/cat-share-links/:code/cats", validCode, onlyInDatabase, (req, res) =>
    handle(
      res,
      async () => {
        // Check the answers before the link is used up, so a mistake does
        // not cost the person their link.
        const { foster: fosterAnswers, ...catAnswers } = req.body ?? {};
        const input = await cleanCatInput(catAnswers);

        if (typeof input.name !== "string" || !input.name.trim()) throw new PortalError("The cat needs a name.", 400);

        const preview = await findOpenLink(req.params.code);

        if (!preview) throw new PortalError(GONE, 404);

        // On a foster link the foster is who the cat is with: the plain foster
        // contact field is not used, and the foster is checked before the link
        // is used up.
        let who = null;

        if (preview.audience === "foster") {
          delete input.fosterContact;
          who = await fosterForCat(fosterAnswers);
        }

        const link = await claimLink(req.params.code);

        if (!link) throw new PortalError(GONE, 404);

        try {
          const actor = actorOfLink(link);
          const fosterId = who?.fosterId ?? (who?.newPerson ? await createUnregisteredFoster(who.newPerson) : undefined);
          const cat = await createCatFromInput(actor, input, { fields: PORTAL_FIELDS, rescuerId: link.rescuerId ?? undefined, fosterId });

          await saveCat(link.id, cat.id);

          logActivity({
            actorId: actor.id,
            actorName: actor.name,
            boardId: CATS.BOARD_ID,
            boardName: "Cats",
            itemId: cat.id,
            itemName: cat.name,
            actionType: "Created",
            description: `${cat.name} was added through a shared link made by ${link.createdByName}`,
          });

          return { id: cat.id, name: cat.name };
        } catch (err) {
          await releaseLink(link.id).catch(() => {});

          throw err;
        }
      },
      "cat share link request",
    ),
  );

  app.post(
    "/api/public/cat-share-links/:code/files",
    validCode,
    onlyInDatabase,
    (req, res, next) =>
      upload.single("file")(req, res, (err) => {
        if (!err) return next();

        res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "That file is too large." : "The upload failed." });
      }),
    (req, res) =>
      handle(
        res,
        async () => {
          const link = await findLinkForUploads(req.params.code);

          if (!link) throw new PortalError(GONE, 404);

          const cat = await getCat(link.catId);

          if (!cat) throw new PortalError("Cat not found.", 404);

          return storeCatFile({ cat, kind: req.body?.kind, file: req.file, actor: actorOfLink(link), who: "shared link" });
        },
        "cat share link request",
      ),
  );
}
