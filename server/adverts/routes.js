import { answer, HttpError } from "../httpAnswer.js";
import { actorOf } from "../database/boardRecords.js";
import { getCat } from "../cats.js";
import { generateAdvertDraft, advertSettings, AdvertError } from "./generate.js";
import { latestDraft, saveDraft, approveLatest, AdvertLockedError } from "./store.js";

// The draft advert of a cat (the Advert tab of the cat page). Staff only
// (requireAuth lets only staff roles through); approving is for Admins.
//
//   GET  /api/cats/:id/advert-draft           { enabled, draft | null }
//   POST /api/cats/:id/advert-draft           makes a new draft -> { enabled, draft }
//   POST /api/cats/:id/advert-draft/edit      saves a manual edit { body } -> { enabled, draft }
//   POST /api/cats/:id/advert-draft/approve   approves and locks the advert -> { enabled, draft }
//
// An approved advert is locked for good: the edit and new-draft routes refuse it.

const ID_PATTERN = /^\d+$/;
const MAX_BODY_LENGTH = 5000;

async function catOf(req) {
  if (!ID_PATTERN.test(req.params.id)) throw new HttpError(400, "Invalid cat id.");

  const cat = await getCat(req.params.id);

  if (!cat) throw new HttpError(404, "Cat not found.");

  return cat;
}

function byOf(req) {
  return { id: String(req.user.sub), name: actorOf(req).name };
}

// Turns an advert error into the answer the person sees.
function toHttpError(err) {
  if (err instanceof AdvertError) return new HttpError(err.status, err.message);
  if (err instanceof AdvertLockedError) return new HttpError(409, err.message);

  return err;
}

export function registerAdvertRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/cats/:id/advert-draft", requireAuth, (req, res) =>
    answer(
      res,
      (async () => {
        await catOf(req);

        return { enabled: advertSettings().enabled, draft: await latestDraft(req.params.id) };
      })(),
      "advert draft",
    ),
  );

  // A person's edit of the draft is saved as a new row (reason "edit"), so the
  // AI's text stays in the history. It works even when the AI is switched off.
  app.post("/api/cats/:id/advert-draft/edit", requireAuth, (req, res) =>
    answer(
      res,
      (async () => {
        await catOf(req);

        const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";

        if (!body) throw new HttpError(400, "The advert cannot be empty.");
        if (body.length > MAX_BODY_LENGTH) throw new HttpError(400, `The advert is too long (the limit is ${MAX_BODY_LENGTH} characters).`);

        try {
          const draft = await saveDraft({ catId: req.params.id, status: "draft", body, reason: "edit", by: byOf(req) });

          return { enabled: advertSettings().enabled, draft };
        } catch (err) {
          throw toHttpError(err);
        }
      })(),
      "advert draft",
    ),
  );

  // Approving locks the advert: it is saved as an 'approved' row, and no
  // edit or new draft is accepted for the cat after it.
  app.post("/api/cats/:id/advert-draft/approve", requireAuth, requireAdmin, (req, res) =>
    answer(
      res,
      (async () => {
        await catOf(req);

        const draft = await approveLatest(req.params.id, byOf(req));

        if (!draft) {
          const latest = await latestDraft(req.params.id);

          throw new HttpError(409, latest?.status === "approved" ? "This advert is already approved." : "There is no draft to approve.");
        }

        return { enabled: advertSettings().enabled, draft };
      })(),
      "advert draft",
    ),
  );

  app.post("/api/cats/:id/advert-draft", requireAuth, (req, res) =>
    answer(
      res,
      (async () => {
        const cat = await catOf(req);

        try {
          const draft = await generateAdvertDraft(cat, { reason: "regenerate", by: byOf(req) });

          return { enabled: true, draft };
        } catch (err) {
          throw toHttpError(err);
        }
      })(),
      "advert draft",
    ),
  );
}
